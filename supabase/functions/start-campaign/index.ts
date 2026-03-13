// ============================================================
// EDGE FUNCTION: start-campaign
// Starts/pauses/resumes/cancels a campaign
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);

    if (!["admin", "manager"].includes(auth.role)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const { campaign_id, action } = body;

    if (!campaign_id) {
      return errorResponse("campaign_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Fetch campaign (RLS ensures tenant isolation)
    const { data: campaign, error: fetchErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (fetchErr || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    const serviceClient = createAdminClient();
    const resolvedAction = action || "start";

    switch (resolvedAction) {
      case "start": {
        // Validate agent exists and is synced
        const { data: agent } = await supabase
          .from("agents")
          .select("id, vapi_assistant_id, status")
          .eq("id", campaign.agent_id)
          .single();

        if (!agent || !agent.vapi_assistant_id) {
          return errorResponse(
            "Agent not found or not synced with voice engine. Please save the agent first."
          );
        }

        if (agent.status !== "active") {
          return errorResponse(
            "Agent must be active to run a campaign"
          );
        }

        if (!campaign.contact_list_id) {
          return errorResponse(
            "No contact list assigned to this campaign"
          );
        }

        // Fetch contacts
        const { data: contacts, error: contactsErr } = await serviceClient
          .from("contacts")
          .select("id, phone, dnc_status")
          .eq("contact_list_id", campaign.contact_list_id)
          .eq("tenant_id", auth.tenantId);

        if (contactsErr || !contacts) {
          return errorResponse("Failed to fetch contacts", 500);
        }

        // Get DNC list
        const { data: dncList } = await serviceClient
          .from("dnc_list")
          .select("phone_number")
          .eq("tenant_id", auth.tenantId);

        const dncSet = new Set(
          (dncList || []).map((d) => d.phone_number)
        );

        const validContacts = contacts.filter(
          (c) => !c.dnc_status && !dncSet.has(c.phone)
        );

        if (validContacts.length === 0) {
          return errorResponse(
            "No valid contacts to call (all are on DNC list or invalid)"
          );
        }

        // Check if campaign_contacts already exist
        const { count: existingCount } = await serviceClient
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id);

        if (!existingCount || existingCount === 0) {
          const campaignContacts = validContacts.map((c, idx) => ({
            tenant_id: auth.tenantId,
            campaign_id: campaign_id,
            contact_id: c.id,
            status: "pending",
            priority: idx + 1,
          }));

          for (let i = 0; i < campaignContacts.length; i += 500) {
            const batch = campaignContacts.slice(i, i + 500);
            const { error: insertErr } = await serviceClient
              .from("campaign_contacts")
              .insert(batch);
            if (insertErr) {
              console.error("Batch insert error:", insertErr);
            }
          }
        }

        // Calculate estimates
        const avgCallDuration = 3.5;
        const callsPerDay = Math.min(
          campaign.max_calls_per_day || 200,
          validContacts.length
        );
        const estimatedDays = Math.ceil(
          validContacts.length / callsPerDay
        );
        const estimatedMinutes = parseFloat(
          (validContacts.length * avgCallDuration).toFixed(2)
        );

        const now = new Date();
        const scheduledStart = campaign.scheduled_start
          ? new Date(campaign.scheduled_start)
          : null;
        const startNow = !scheduledStart || scheduledStart <= now;

        await serviceClient
          .from("campaigns")
          .update({
            status: startNow ? "active" : "scheduled",
            total_contacts: validContacts.length,
            actual_start: startNow ? now.toISOString() : null,
            estimated_days_to_complete: estimatedDays,
            estimated_minutes_usage: estimatedMinutes,
          })
          .eq("id", campaign_id);

        await serviceClient
          .from("contact_lists")
          .update({
            last_used_at: now.toISOString(),
            last_used_campaign: campaign.name,
          })
          .eq("id", campaign.contact_list_id);

        return successResponse({
          success: true,
          status: startNow ? "active" : "scheduled",
          contacts_queued: validContacts.length,
          contacts_skipped_dnc: contacts.length - validContacts.length,
          estimated_days: estimatedDays,
          estimated_minutes: estimatedMinutes,
        });
      }

      case "pause": {
        await serviceClient
          .from("campaigns")
          .update({ status: "paused" })
          .eq("id", campaign_id);
        return successResponse({ success: true, status: "paused" });
      }

      case "resume": {
        await serviceClient
          .from("campaigns")
          .update({ status: "active" })
          .eq("id", campaign_id);
        return successResponse({ success: true, status: "active" });
      }

      case "cancel": {
        await serviceClient
          .from("campaign_contacts")
          .update({ status: "skipped" })
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        await serviceClient
          .from("campaigns")
          .update({
            status: "cancelled",
            actual_end: new Date().toISOString(),
          })
          .eq("id", campaign_id);

        return successResponse({ success: true, status: "cancelled" });
      }

      default:
        return errorResponse(`Unknown action: ${resolvedAction}`);
    }
  } catch (err) {
    console.error("start-campaign error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

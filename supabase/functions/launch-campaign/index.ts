// ============================================================
// EDGE FUNCTION: launch-campaign
//
// Starts/pauses/resumes/cancels a campaign.
// Uses VAPI's native Campaign API when available, falls back
// to manual queue approach.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vapiRequest } from "../_shared/vapi-client.ts";
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

    const adminClient = createAdminClient();
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
            "Agent not found or not synced with the voice engine. Please save the agent first."
          );
        }

        if (agent.status !== "active" && agent.status !== "draft") {
          return errorResponse("Agent must be active to run a campaign");
        }

        if (!campaign.contact_list_id) {
          return errorResponse("No contact list assigned to this campaign");
        }

        // Fetch all contacts from the contact list
        const { data: contacts, error: contactsErr } = await adminClient
          .from("contacts")
          .select("id, phone, first_name, last_name, email, dnc_status")
          .eq("contact_list_id", campaign.contact_list_id)
          .eq("tenant_id", auth.tenantId);

        if (contactsErr || !contacts) {
          return errorResponse("Failed to fetch contacts");
        }

        // Get DNC list
        const { data: dncList } = await adminClient
          .from("dnc_list")
          .select("phone_number")
          .eq("tenant_id", auth.tenantId);

        const dncSet = new Set(
          (dncList || []).map((d) => d.phone_number)
        );

        // Filter out DNC contacts
        const validContacts = contacts.filter(
          (c) => !c.dnc_status && !dncSet.has(c.phone)
        );

        if (validContacts.length === 0) {
          return errorResponse(
            "No valid contacts to call (all are on the DNC list or invalid)"
          );
        }

        // Check if campaign_contacts already exist (avoid duplicates on re-start)
        const { count: existingCount } = await adminClient
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id);

        if (!existingCount || existingCount === 0) {
          // Copy contacts into campaign_contacts
          const campaignContacts = validContacts.map((c, idx) => ({
            tenant_id: auth.tenantId,
            campaign_id: campaign_id,
            contact_id: c.id,
            status: "pending",
            priority: idx + 1,
          }));

          // Insert in batches of 500 — rollback all on any failure
          for (let i = 0; i < campaignContacts.length; i += 500) {
            const batch = campaignContacts.slice(i, i + 500);
            const { error: insertError } = await adminClient
              .from("campaign_contacts")
              .insert(batch);

            if (insertError) {
              // Clean up any batches already inserted for this campaign
              await adminClient
                .from("campaign_contacts")
                .delete()
                .eq("campaign_id", campaign_id)
                .eq("status", "pending");

              throw new Error(`Failed to insert campaign contacts (batch ${Math.floor(i / 500) + 1}): ${insertError.message}`);
            }
          }
        }

        // Get outbound phone number
        const { data: phoneNumber } = await supabase
          .from("phone_numbers")
          .select("id, vapi_phone_id, phone_number")
          .eq("tenant_id", auth.tenantId)
          .eq("status", "active")
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Try VAPI native Campaign API
        let vapiCampaignId: string | null = null;
        let launchMethod = "manual_queue";

        if (phoneNumber?.vapi_phone_id) {
          const vapiCustomers = validContacts.map((contact) => ({
            number: contact.phone,
            name: `${contact.first_name} ${contact.last_name}`,
            ...(contact.email && { email: contact.email }),
          }));

          const vapiCampaignPayload: Record<string, unknown> = {
            name: `${campaign.name} [${auth.tenantId.slice(0, 8)}]`,
            assistantId: agent.vapi_assistant_id,
            phoneNumberId: phoneNumber.vapi_phone_id,
            customers: vapiCustomers,
            ...(campaign.scheduled_start && {
              scheduledAt: campaign.scheduled_start,
            }),
          };

          const vapiResult = await vapiRequest<{ id: string }>({
            method: "POST",
            endpoint: "/campaign",
            body: vapiCampaignPayload,
          });

          if (vapiResult.ok && vapiResult.data) {
            vapiCampaignId = vapiResult.data.id;
            launchMethod = "vapi_native";
            console.log(`VAPI campaign created: ${vapiCampaignId}`);
          } else {
            console.warn(
              "VAPI campaign API failed, using manual launch mode:",
              vapiResult.error
            );
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

        // Determine if starting now or scheduling for later
        const now = new Date();
        const scheduledStart = campaign.scheduled_start
          ? new Date(campaign.scheduled_start)
          : null;
        const startNow = !scheduledStart || scheduledStart <= now;

        // Update campaign
        await adminClient
          .from("campaigns")
          .update({
            status: startNow ? "active" : "scheduled",
            total_contacts: validContacts.length,
            actual_start: startNow ? now.toISOString() : null,
            estimated_days_to_complete: estimatedDays,
            estimated_minutes_usage: estimatedMinutes,
          })
          .eq("id", campaign_id);

        // Update contact list usage
        await adminClient
          .from("contact_lists")
          .update({
            last_used_at: now.toISOString(),
            last_used_campaign: campaign.name,
          })
          .eq("id", campaign.contact_list_id);

        return successResponse({
          campaign_id,
          status: startNow ? "active" : "scheduled",
          total_contacts: validContacts.length,
          contacts_skipped_dnc: contacts.length - validContacts.length,
          estimated_days: estimatedDays,
          estimated_minutes: estimatedMinutes,
          launch_method: launchMethod,
          vapi_campaign_id: vapiCampaignId,
          message: `Campaign launched with ${validContacts.length} contacts.`,
        });
      }

      case "pause": {
        await adminClient
          .from("campaigns")
          .update({ status: "paused" })
          .eq("id", campaign_id);
        return successResponse({
          campaign_id,
          status: "paused",
          message: "Campaign paused",
        });
      }

      case "resume": {
        await adminClient
          .from("campaigns")
          .update({ status: "active" })
          .eq("id", campaign_id);
        return successResponse({
          campaign_id,
          status: "active",
          message: "Campaign resumed",
        });
      }

      case "cancel": {
        // Set all pending contacts to skipped
        await adminClient
          .from("campaign_contacts")
          .update({ status: "skipped" })
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        await adminClient
          .from("campaigns")
          .update({
            status: "cancelled",
            actual_end: new Date().toISOString(),
          })
          .eq("id", campaign_id);

        return successResponse({
          campaign_id,
          status: "cancelled",
          message: "Campaign cancelled",
        });
      }

      default:
        return errorResponse(`Unknown action: ${resolvedAction}`);
    }
  } catch (err) {
    console.error("launch-campaign error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

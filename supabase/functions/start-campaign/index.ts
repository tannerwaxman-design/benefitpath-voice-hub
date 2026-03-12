import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { campaign_id, action } = body;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!tenantUser || !["admin", "manager"].includes(tenantUser.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const tenantId = tenantUser.tenant_id;

    // Fetch campaign (RLS ensures tenant isolation)
    const { data: campaign, error: fetchErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (fetchErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle different actions
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
          return new Response(JSON.stringify({ error: "Agent not found or not synced with voice engine. Please save the agent first." }), {
            status: 400, headers: corsHeaders,
          });
        }

        if (agent.status !== "active") {
          return new Response(JSON.stringify({ error: "Agent must be active to run a campaign" }), {
            status: 400, headers: corsHeaders,
          });
        }

        if (!campaign.contact_list_id) {
          return new Response(JSON.stringify({ error: "No contact list assigned to this campaign" }), {
            status: 400, headers: corsHeaders,
          });
        }

        // Fetch all contacts from the contact list
        const { data: contacts, error: contactsErr } = await serviceClient
          .from("contacts")
          .select("id, phone, dnc_status")
          .eq("contact_list_id", campaign.contact_list_id)
          .eq("tenant_id", tenantId);

        if (contactsErr || !contacts) {
          return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), { status: 500, headers: corsHeaders });
        }

        // Also get DNC list for this tenant
        const { data: dncList } = await serviceClient
          .from("dnc_list")
          .select("phone_number")
          .eq("tenant_id", tenantId);

        const dncSet = new Set((dncList || []).map(d => d.phone_number));

        // Filter out DNC contacts and those already marked as DNC on the contact record
        const validContacts = contacts.filter(c => !c.dnc_status && !dncSet.has(c.phone));

        if (validContacts.length === 0) {
          return new Response(JSON.stringify({ error: "No valid contacts to call (all are on DNC list or invalid)" }), {
            status: 400, headers: corsHeaders,
          });
        }

        // Check if campaign_contacts already exist (avoid duplicates on re-start)
        const { count: existingCount } = await serviceClient
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id);

        if (!existingCount || existingCount === 0) {
          // Copy contacts into campaign_contacts
          const campaignContacts = validContacts.map((c, idx) => ({
            tenant_id: tenantId,
            campaign_id: campaign_id,
            contact_id: c.id,
            status: "pending",
            priority: idx + 1, // Priority by order in list
          }));

          // Insert in batches of 500
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
        const avgCallDuration = 3.5; // minutes
        const callsPerDay = Math.min(campaign.max_calls_per_day || 200, validContacts.length);
        const estimatedDays = Math.ceil(validContacts.length / callsPerDay);
        const estimatedMinutes = parseFloat((validContacts.length * avgCallDuration).toFixed(2));

        // Determine if starting now or scheduling for later
        const now = new Date();
        const scheduledStart = campaign.scheduled_start ? new Date(campaign.scheduled_start) : null;
        const startNow = !scheduledStart || scheduledStart <= now;

        // Update campaign
        await serviceClient.from("campaigns").update({
          status: startNow ? "active" : "scheduled",
          total_contacts: validContacts.length,
          actual_start: startNow ? now.toISOString() : null,
          estimated_days_to_complete: estimatedDays,
          estimated_minutes_usage: estimatedMinutes,
        }).eq("id", campaign_id);

        // Update contact list usage
        await serviceClient.from("contact_lists").update({
          last_used_at: now.toISOString(),
          last_used_campaign: campaign.name,
        }).eq("id", campaign.contact_list_id);

        return new Response(JSON.stringify({
          success: true,
          status: startNow ? "active" : "scheduled",
          contacts_queued: validContacts.length,
          contacts_skipped_dnc: contacts.length - validContacts.length,
          estimated_days: estimatedDays,
          estimated_minutes: estimatedMinutes,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "pause": {
        await serviceClient.from("campaigns").update({ status: "paused" }).eq("id", campaign_id);
        return new Response(JSON.stringify({ success: true, status: "paused" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resume": {
        await serviceClient.from("campaigns").update({ status: "active" }).eq("id", campaign_id);
        return new Response(JSON.stringify({ success: true, status: "active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancel": {
        // Set all pending contacts to skipped
        await serviceClient
          .from("campaign_contacts")
          .update({ status: "skipped" })
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        await serviceClient.from("campaigns").update({
          status: "cancelled",
          actual_end: new Date().toISOString(),
        }).eq("id", campaign_id);

        return new Response(JSON.stringify({ success: true, status: "cancelled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${resolvedAction}` }), {
          status: 400, headers: corsHeaders,
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

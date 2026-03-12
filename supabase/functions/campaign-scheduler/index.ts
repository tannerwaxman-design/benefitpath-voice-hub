import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

// This function is triggered by pg_cron every 60 seconds
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active campaigns
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*, agents!inner(vapi_assistant_id, greeting_script)")
      .eq("status", "active");

    if (error || !campaigns?.length) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });
    }

    let totalLaunched = 0;

    for (const campaign of campaigns) {
      // Check calling window
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

      const windowStart = campaign.calling_window_start || "09:00";
      const windowEnd = campaign.calling_window_end || "18:00";

      if (currentTime < windowStart || currentTime > windowEnd) continue;

      // Check calling days
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = dayNames[now.getDay()];
      const callingDays = campaign.calling_days || ["monday", "tuesday", "wednesday", "thursday", "friday"];
      if (!callingDays.includes(today)) continue;

      // Count in-progress calls for this campaign
      const { count: activeCalls } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("outcome", "in_progress");

      const maxConcurrent = campaign.max_concurrent_calls || 5;
      const slotsAvailable = maxConcurrent - (activeCalls || 0);

      if (slotsAvailable <= 0) continue;

      // Check daily call limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: todayCalls } = await supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .gte("started_at", todayStart.toISOString());

      const maxPerDay = campaign.max_calls_per_day || 200;
      const dailySlotsLeft = maxPerDay - (todayCalls || 0);
      if (dailySlotsLeft <= 0) continue;

      const toFetch = Math.min(slotsAvailable, dailySlotsLeft);

      // Find contacts to call
      const { data: contactsToCall } = await supabase
        .from("campaign_contacts")
        .select("*, contacts!inner(phone, first_name, last_name, dnc_status)")
        .eq("campaign_id", campaign.id)
        .in("status", ["pending", "callback_scheduled"])
        .eq("contacts.dnc_status", false)
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
        .order("priority", { ascending: true })
        .order("next_attempt_at", { ascending: true, nullsFirst: true })
        .limit(toFetch);

      if (!contactsToCall?.length) {
        // Check if campaign is done
        const { count: pendingCount } = await supabase
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .in("status", ["pending", "queued", "calling", "callback_scheduled"]);

        if (pendingCount === 0) {
          await supabase.from("campaigns").update({
            status: "completed",
            actual_end: now.toISOString(),
          }).eq("id", campaign.id);
        }
        continue;
      }

      // Launch calls
      for (const cc of contactsToCall) {
        const contact = (cc as any).contacts;
        const contactName = `${contact.first_name} ${contact.last_name}`;

        // Get a phone number
        const { data: phoneNumber } = await supabase
          .from("phone_numbers")
          .select("*")
          .eq("tenant_id", campaign.tenant_id)
          .eq("status", "active")
          .order("is_default", { ascending: false })
          .limit(1)
          .single();

        if (!phoneNumber) continue;

        const personalizedGreeting = (campaign.agents?.greeting_script || "")
          .replace(/\[Contact Name\]/gi, contact.first_name);

        const vapiPayload: any = {
          assistantId: campaign.agents?.vapi_assistant_id,
          customer: { number: contact.phone, name: contactName },
          assistantOverrides: {
            metadata: {
              tenant_id: campaign.tenant_id,
              agent_id: campaign.agent_id,
              campaign_id: campaign.id,
              campaign_contact_id: cc.id,
              contact_id: cc.contact_id,
              phone_number_id: phoneNumber.id,
            },
            firstMessage: personalizedGreeting,
          },
        };

        if (phoneNumber.vapi_phone_id) {
          vapiPayload.phoneNumberId = phoneNumber.vapi_phone_id;
        }

        try {
          const vapiRes = await fetch(`${VAPI_BASE_URL}/call`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(vapiPayload),
          });

          if (vapiRes.ok) {
            const vapiCall = await vapiRes.json();

            await supabase.from("calls").insert({
              tenant_id: campaign.tenant_id,
              vapi_call_id: vapiCall.id,
              agent_id: campaign.agent_id,
              campaign_id: campaign.id,
              campaign_contact_id: cc.id,
              contact_id: cc.contact_id,
              phone_number_id: phoneNumber.id,
              direction: "outbound",
              from_number: phoneNumber.phone_number,
              to_number: contact.phone,
              contact_name: contactName,
              started_at: new Date().toISOString(),
              outcome: "in_progress",
            });

            await supabase.from("campaign_contacts").update({
              status: "calling",
              last_attempt_at: new Date().toISOString(),
              total_attempts: (cc.total_attempts || 0) + 1,
            }).eq("id", cc.id);

            totalLaunched++;
          }
        } catch (callErr) {
          console.error(`Failed to launch call for contact ${cc.contact_id}:`, callErr);
        }

        // Delay between calls
        const delay = campaign.agents?.delay_between_calls_seconds || 3;
        if (delay > 0) await new Promise(r => setTimeout(r, delay * 1000));
      }
    }

    return new Response(JSON.stringify({ processed: totalLaunched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Campaign scheduler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

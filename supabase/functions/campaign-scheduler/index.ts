// ============================================================
// EDGE FUNCTION: campaign-scheduler
// Triggered by pg_cron every 60 seconds. Finds active campaigns
// and launches calls for pending contacts.
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { insertNotification } from "../_shared/notifications.ts";
import {
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const supabase = createAdminClient();

    // Get all active campaigns
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*, agents!inner(vapi_assistant_id, greeting_script, delay_between_calls_seconds)")
      .eq("status", "active");

    if (error || !campaigns?.length) {
      return successResponse({ processed: 0 });
    }

    let totalLaunched = 0;

    for (const campaign of campaigns) {
      // Check calling window using campaign timezone
      const now = new Date();
      
      // Get tenant timezone for this campaign
      const { data: tenant } = await supabase
        .from("tenants")
        .select("default_timezone")
        .eq("id", campaign.tenant_id)
        .single();
      
      const tz = tenant?.default_timezone || "America/New_York";
      const localTimeStr = now.toLocaleTimeString("en-US", { 
        timeZone: tz, 
        hour12: false, 
        hour: "2-digit", 
        minute: "2-digit" 
      });

      // Strip seconds from window values if present (e.g. "09:00:00" -> "09:00")
      const windowStart = (campaign.calling_window_start || "09:00").substring(0, 5);
      const windowEnd = (campaign.calling_window_end || "18:00").substring(0, 5);

      console.log(`Campaign ${campaign.name}: localTime=${localTimeStr}, window=${windowStart}-${windowEnd}, tz=${tz}`);

      if (localTimeStr < windowStart || localTimeStr > windowEnd) {
        console.log(`Campaign ${campaign.name}: outside calling window, skipping`);
        continue;
      }

      // Check calling days
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const today = dayNames[now.getDay()];
      const callingDays = campaign.calling_days || [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
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
        .select(
          "*, contacts!inner(phone, first_name, last_name, dnc_status)"
        )
        .eq("campaign_id", campaign.id)
        .in("status", ["pending", "callback_scheduled"])
        .eq("contacts.dnc_status", false)
        .or(
          `next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`
        )
        .order("priority", { ascending: true })
        .order("next_attempt_at", { ascending: true, nullsFirst: true })
        .limit(toFetch);

      // Smart Schedule: reorder contacts by current time slot score
      let orderedContacts = contactsToCall || [];
      if (campaign.smart_schedule_enabled && contactsToCall?.length) {
        const currentHour = parseInt(localTimeStr.split(":")[0]);
        const currentDay = now.getDay();
        
        // Check if current time is a good slot
        const { data: slotData } = await supabase
          .from("smart_schedule")
          .select("score, connect_rate")
          .eq("tenant_id", campaign.tenant_id)
          .eq("day_of_week", currentDay)
          .eq("hour_of_day", currentHour)
          .maybeSingle();

        // If current slot is "avoid" and we have data, skip this cycle
        if (slotData?.score === "avoid") {
          console.log(`Campaign ${campaign.name}: Smart Schedule says avoid hour ${currentHour}, skipping`);
          continue;
        }
      }

      if (!contactsToCall?.length) {
        // Check if campaign is done
        const { count: pendingCount } = await supabase
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .in("status", [
            "pending",
            "queued",
            "calling",
            "callback_scheduled",
          ]);

        if (pendingCount === 0) {
          await supabase
            .from("campaigns")
            .update({
              status: "completed",
              actual_end: now.toISOString(),
            })
            .eq("id", campaign.id);

          // Notify: campaign completed
          await insertNotification(supabase, campaign.tenant_id, {
            type: "success",
            title: "Campaign completed",
            body: `"${campaign.name}" has finished calling all contacts.`,
            icon: "campaign",
            link: "/campaigns",
          });
        }
        continue;
      }

      // Launch calls
      for (const cc of contactsToCall) {
        const contact = (cc as Record<string, unknown>).contacts as Record<
          string,
          string
        >;
        const contactName = `${contact.first_name} ${contact.last_name}`;

        // Get a phone number
        const { data: phoneNumber } = await supabase
          .from("phone_numbers")
          .select("*")
          .eq("tenant_id", campaign.tenant_id)
          .eq("status", "active")
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!phoneNumber) continue;

        const personalizedGreeting = (
          (campaign.agents as Record<string, string>)?.greeting_script || ""
        ).replace(/\[Contact Name\]/gi, contact.first_name);

        const vapiPayload: Record<string, unknown> = {
          assistantId: (campaign.agents as Record<string, string>)
            ?.vapi_assistant_id,
          customer: { number: contact.phone, name: contactName },
          assistantOverrides: {
            metadata: {
              benefitpath_tenant_id: campaign.tenant_id,
              benefitpath_agent_id: campaign.agent_id,
              benefitpath_campaign_id: campaign.id,
              benefitpath_campaign_contact_id: cc.id,
              benefitpath_contact_id: cc.contact_id,
              benefitpath_is_test_call: false,
            },
            firstMessage: personalizedGreeting,
          },
        };

        if (phoneNumber.vapi_phone_id) {
          vapiPayload.phoneNumberId = phoneNumber.vapi_phone_id;
        }

        try {
          const vapiResult = await vapiRequest<{ id: string }>({
            method: "POST",
            endpoint: "/call",
            body: vapiPayload,
          });

          if (vapiResult.ok && vapiResult.data) {
            await supabase.from("calls").insert({
              tenant_id: campaign.tenant_id,
              vapi_call_id: vapiResult.data.id,
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

            await supabase
              .from("campaign_contacts")
              .update({
                status: "calling",
                last_attempt_at: new Date().toISOString(),
                total_attempts: (cc.total_attempts || 0) + 1,
              })
              .eq("id", cc.id);

            totalLaunched++;
          }
        } catch (callErr) {
          console.error(
            `Failed to launch call for contact ${cc.contact_id}:`,
            callErr
          );
        }

        // Delay between calls
        const delay =
          (campaign.agents as Record<string, number>)
            ?.delay_between_calls_seconds || 3;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay * 1000));
      }
    }

    return successResponse({ processed: totalLaunched });
  } catch (err) {
    console.error("Campaign scheduler error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

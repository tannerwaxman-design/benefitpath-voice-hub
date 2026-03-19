// ============================================================
// EDGE FUNCTION: launch-call
// Launches a single outbound call via VAPI
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const body = await req.json();
    const {
      agent_id,
      contact_id,
      contact_phone,
      campaign_id,
      campaign_contact_id,
      phone_number_id,
      is_test_call,
    } = body;

    if (!agent_id) {
      return errorResponse("agent_id is required");
    }

    // Fetch tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", auth.tenantId)
      .single();

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // === BILLING ENFORCEMENT ===
    if ((tenant.credit_balance ?? 0) <= 0) {
      return errorResponse(
        "Insufficient credit balance. Please add credits to continue.",
        429
      );
    }

    const serviceClient = createAdminClient();

    // Low balance warning
    if ((tenant.credit_balance ?? 0) <= 5 && tenant.webhook_url && tenant.webhook_events?.includes("usage_alert")) {
      fetch(tenant.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "usage_alert",
          level: "low_balance",
          credit_balance: tenant.credit_balance,
        }),
      }).catch(() => {});
    }

    // Fetch agent
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (!agent || !agent.vapi_assistant_id) {
      return errorResponse(
        "Agent not found or not synced with voice engine",
        404
      );
    }

    // Determine phone number to call
    let toNumber = contact_phone;
    let contactName = "Unknown";
    let contactIdFinal = contact_id;

    if (contact_id && !contact_phone) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contact_id)
        .single();

      if (!contact) {
        return errorResponse("Contact not found", 404);
      }

      if (contact.dnc_status) {
        return errorResponse("Contact is on DNC list", 403);
      }

      toNumber = contact.phone;
      contactName = `${contact.first_name} ${contact.last_name}`;
    }

    if (!toNumber) {
      return errorResponse("No phone number provided");
    }

    // Check DNC list table
    const { data: dncEntry } = await serviceClient
      .from("dnc_list")
      .select("id")
      .eq("tenant_id", auth.tenantId)
      .eq("phone_number", toNumber)
      .maybeSingle();

    if (dncEntry) {
      return errorResponse("Phone number is on Do Not Call list", 403);
    }

    // Get from number
    let fromNumber = "";
    let phoneNumberIdFinal = phone_number_id;
    let vapiPhoneNumberId: string | null = null;

    if (phone_number_id) {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("id", phone_number_id)
        .single();
      if (pn) {
        fromNumber = pn.phone_number;
        vapiPhoneNumberId = pn.vapi_phone_id;
      }
    } else {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("tenant_id", auth.tenantId)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pn) {
        fromNumber = pn.phone_number;
        phoneNumberIdFinal = pn.id;
        vapiPhoneNumberId = pn.vapi_phone_id;
      }
    }

    if (!vapiPhoneNumberId) {
      return errorResponse("No active voice-enabled phone number found", 400);
    }

    // === A/B TEST ROUTING ===
    let abTestId: string | null = null;
    let abTestVersion: string | null = null;
    let greetingToUse = agent.greeting_script;

    // Check for active A/B tests on greeting field
    const { data: activeAbTests } = await supabase
      .from("ab_tests")
      .select("*")
      .eq("agent_id", agent.id)
      .eq("status", "running");

    if (activeAbTests && activeAbTests.length > 0) {
      for (const abTest of activeAbTests) {
        const roll = Math.random() * 100;
        const version = roll < (100 - abTest.traffic_split) ? "a" : "b";
        abTestId = abTest.id;
        abTestVersion = version;

        if (abTest.field === "greeting") {
          greetingToUse = version === "a" ? abTest.version_a_text : abTest.version_b_text;
        }
        // Only handle one test per call for now
        break;
      }
    }

    // Personalize greeting
    const firstName = contactName.split(" ")[0];
    const personalizedGreeting = greetingToUse
      .replace(/\[Contact Name\]/gi, firstName)
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[Company\]/gi, tenant.company_name);

    // Build VAPI call payload with correct metadata keys
    const vapiCallPayload: Record<string, unknown> = {
      assistantId: agent.vapi_assistant_id,
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: toNumber,
        name: contactName,
      },
      assistantOverrides: {
        metadata: {
          benefitpath_tenant_id: auth.tenantId,
          benefitpath_agent_id: agent.id,
          benefitpath_contact_id: contactIdFinal || null,
          benefitpath_campaign_id: campaign_id || null,
          benefitpath_campaign_contact_id: campaign_contact_id || null,
          benefitpath_is_test_call: is_test_call || false,
          benefitpath_ab_test_id: abTestId,
          benefitpath_ab_test_version: abTestVersion,
        },
        firstMessage: personalizedGreeting,
      },
    };

    // Call VAPI
    const vapiResult = await vapiRequest<{ id: string }>({
      method: "POST",
      endpoint: "/call",
      body: vapiCallPayload,
    });

    if (!vapiResult.ok || !vapiResult.data) {
      return errorResponse(
        "Failed to launch call: " + (vapiResult.error || "Unknown error"),
        502
      );
    }

    // Create call record using service client
    const { data: callRecord, error: callErr } = await serviceClient
      .from("calls")
      .insert({
        tenant_id: auth.tenantId,
        vapi_call_id: vapiResult.data.id,
        agent_id: agent.id,
        campaign_id: campaign_id || null,
        campaign_contact_id: campaign_contact_id || null,
        contact_id: contactIdFinal || null,
        phone_number_id: phoneNumberIdFinal || null,
        direction: "outbound",
        from_number: fromNumber || "unknown",
        to_number: toNumber,
        contact_name: contactName,
        started_at: new Date().toISOString(),
        outcome: "in_progress",
      })
      .select()
      .single();

    if (callErr) {
      console.error("Failed to create call record:", callErr);
    }

    // Update campaign_contact status if applicable
    if (campaign_contact_id) {
      await serviceClient
        .from("campaign_contacts")
        .update({
          status: "calling",
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", campaign_contact_id);
    }

    return successResponse(
      {
        call_id: callRecord?.id,
        vapi_call_id: vapiResult.data.id,
        credit_balance: tenant.credit_balance,
      },
      201
    );
  } catch (err) {
    console.error("launch-call error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

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
    const { agent_id, contact_id, contact_phone, campaign_id, campaign_contact_id, phone_number_id, is_test_call } = body;

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: "No tenant" }), { status: 403, headers: corsHeaders });
    }

    const tenantId = tenantUser.tenant_id;

    // Fetch tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404, headers: corsHeaders });
    }

    // === BILLING ENFORCEMENT ===
    const usagePercent = tenant.minutes_used_this_cycle / tenant.monthly_minute_limit;

    // Hard stop: if at or over limit
    if (tenant.minutes_used_this_cycle >= tenant.monthly_minute_limit) {
      return new Response(JSON.stringify({
        error: "Monthly minute limit reached. Upgrade your plan to continue.",
        code: "MINUTE_LIMIT_REACHED",
        minutes_used: tenant.minutes_used_this_cycle,
        monthly_limit: tenant.monthly_minute_limit,
      }), { status: 429, headers: corsHeaders });
    }

    // Service client for logging (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Warning at 80% usage
    if (usagePercent >= 0.8 && usagePercent < 1.0) {
      // Fire usage alert webhook if configured
      if (tenant.webhook_url && tenant.webhook_events?.includes("usage_alert")) {
        fetch(tenant.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "usage_alert",
            level: "approaching_limit",
            minutes_used: tenant.minutes_used_this_cycle,
            monthly_limit: tenant.monthly_minute_limit,
            usage_percent: Math.round(usagePercent * 100),
          }),
        }).catch(() => {});
      }
    }

    // Fetch agent
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!agent || !agent.vapi_assistant_id) {
      return new Response(JSON.stringify({ error: "Agent not found or not synced with voice engine" }), { status: 404, headers: corsHeaders });
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
        .eq("tenant_id", tenantId)
        .single();

      if (!contact) {
        return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: corsHeaders });
      }

      // Check DNC
      if (contact.dnc_status) {
        return new Response(JSON.stringify({ error: "Contact is on DNC list" }), { status: 403, headers: corsHeaders });
      }

      toNumber = contact.phone;
      contactName = `${contact.first_name} ${contact.last_name}`;
    }

    if (!toNumber) {
      return new Response(JSON.stringify({ error: "No phone number provided" }), { status: 400, headers: corsHeaders });
    }

    // Also check DNC list table directly
    const { data: dncEntry } = await serviceClient
      .from("dnc_list")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_number", toNumber)
      .maybeSingle();

    if (dncEntry) {
      return new Response(JSON.stringify({ error: "Phone number is on Do Not Call list" }), { status: 403, headers: corsHeaders });
    }

    // Get from number
    let fromNumber = "";
    let phoneNumberIdFinal = phone_number_id;
    if (phone_number_id) {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("id", phone_number_id)
        .eq("tenant_id", tenantId)
        .single();
      if (pn) fromNumber = pn.phone_number;
    } else {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .limit(1)
        .single();
      if (pn) {
        fromNumber = pn.phone_number;
        phoneNumberIdFinal = pn.id;
      }
    }

    // Personalize greeting
    const firstName = contactName.split(" ")[0];
    const personalizedGreeting = agent.greeting_script
      .replace(/\[Contact Name\]/gi, firstName)
      .replace(/\[Company\]/gi, tenant.company_name);

    // Build VAPI call payload
    const vapiCallPayload: any = {
      assistantId: agent.vapi_assistant_id,
      customer: {
        number: toNumber,
        name: contactName,
      },
      assistantOverrides: {
        metadata: {
          tenant_id: tenantId,
          agent_id: agent.id,
          campaign_id: campaign_id || null,
          campaign_contact_id: campaign_contact_id || null,
          contact_id: contactIdFinal || null,
          phone_number_id: phoneNumberIdFinal || null,
          is_test_call: is_test_call || false,
        },
        firstMessage: personalizedGreeting,
      },
    };

    // Add phone number if we have a VAPI phone ID
    if (phone_number_id) {
      const { data: pn } = await supabase
        .from("phone_numbers")
        .select("vapi_phone_id")
        .eq("id", phone_number_id)
        .single();
      if (pn?.vapi_phone_id) {
        vapiCallPayload.phoneNumberId = pn.vapi_phone_id;
      }
    }

    // Call VAPI
    const vapiRes = await fetch(`${VAPI_BASE_URL}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiCallPayload),
    });

    if (!vapiRes.ok) {
      const errText = await vapiRes.text();
      return new Response(JSON.stringify({ error: "Failed to launch call", details: errText }), {
        status: 502, headers: corsHeaders,
      });
    }

    const vapiCall = await vapiRes.json();

    // Create call record
    const { data: callRecord, error: callErr } = await serviceClient
      .from("calls")
      .insert({
        tenant_id: tenantId,
        vapi_call_id: vapiCall.id,
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

    // Update campaign_contact status if applicable
    if (campaign_contact_id) {
      await serviceClient
        .from("campaign_contacts")
        .update({ status: "calling", last_attempt_at: new Date().toISOString() })
        .eq("id", campaign_contact_id);
    }

    return new Response(JSON.stringify({
      call_id: callRecord?.id,
      vapi_call_id: vapiCall.id,
      minutes_remaining: tenant.monthly_minute_limit - tenant.minutes_used_this_cycle,
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

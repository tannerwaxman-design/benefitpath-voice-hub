import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth-helpers.ts";

// Public API endpoint authenticated via tenant API keys
// Supports: trigger calls, manage contacts, read call logs

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

async function authenticateApiKey(apiKey: string) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin
    .from("tenant_api_keys")
    .select("id, tenant_id, status")
    .eq("api_key", apiKey)
    .single();

  if (error || !data) return null;
  if (data.status !== "active") return null;

  // Update last_used_at
  await admin
    .from("tenant_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { tenantId: data.tenant_id, admin };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Missing or invalid Authorization header. Use: Bearer <api_key>", 401);
    }

    const apiKey = authHeader.slice(7);
    const auth = await authenticateApiKey(apiKey);
    if (!auth) {
      return errorResponse("Invalid or inactive API key", 401);
    }

    const { tenantId, admin } = auth;
    const url = new URL(req.url);
    const path = url.pathname.split("/public-api")[1] || "";
    const method = req.method;

    // ============ ROUTES ============

    // --- CONTACTS ---
    if (path === "/contacts" && method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
      const offset = Number(url.searchParams.get("offset") || 0);
      const { data, error, count } = await admin
        .from("contacts")
        .select("id, first_name, last_name, phone, email, company, tags, dnc_status, last_outcome, total_calls, created_at", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ contacts: data, total: count, limit, offset });
    }

    if (path === "/contacts" && method === "POST") {
      const body = await req.json();
      const { first_name, last_name, phone, email, company, tags, contact_list_id } = body;
      if (!first_name || !last_name || !phone) {
        return errorResponse("first_name, last_name, and phone are required");
      }
      const { data, error } = await admin
        .from("contacts")
        .insert({ tenant_id: tenantId, first_name, last_name, phone, email, company, tags, contact_list_id })
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ contact: data }, 201);
    }

    if (path.startsWith("/contacts/") && method === "PUT") {
      const contactId = path.split("/contacts/")[1];
      const body = await req.json();
      const { first_name, last_name, phone, email, company, tags } = body;
      const { data, error } = await admin
        .from("contacts")
        .update({ first_name, last_name, phone, email, company, tags, updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ contact: data });
    }

    if (path.startsWith("/contacts/") && method === "DELETE") {
      const contactId = path.split("/contacts/")[1];
      const { error } = await admin
        .from("contacts")
        .delete()
        .eq("id", contactId)
        .eq("tenant_id", tenantId);
      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ deleted: true });
    }

    // --- CALLS ---
    if (path === "/calls" && method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
      const offset = Number(url.searchParams.get("offset") || 0);
      const { data, error, count } = await admin
        .from("calls")
        .select("id, vapi_call_id, contact_name, from_number, to_number, direction, outcome, duration_seconds, summary, sentiment, detected_intent, started_at, ended_at, recording_url, cost_total", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ calls: data, total: count, limit, offset });
    }

    if (path.startsWith("/calls/") && method === "GET") {
      const callId = path.split("/calls/")[1];
      const { data, error } = await admin
        .from("calls")
        .select("*")
        .eq("id", callId)
        .eq("tenant_id", tenantId)
        .single();
      if (error) return errorResponse(error.message === "JSON object requested, multiple (or no) rows returned" ? "Call not found" : error.message, error.message.includes("rows returned") ? 404 : 500);
      return jsonResponse({ call: data });
    }

    // --- TRIGGER CALL ---
    if (path === "/calls/trigger" && method === "POST") {
      const body = await req.json();
      const { agent_id, phone_number, contact_name } = body;
      if (!agent_id || !phone_number) {
        return errorResponse("agent_id and phone_number are required");
      }

      // Verify agent belongs to tenant
      const { data: agent } = await admin
        .from("agents")
        .select("id, vapi_assistant_id")
        .eq("id", agent_id)
        .eq("tenant_id", tenantId)
        .single();

      if (!agent) return errorResponse("Agent not found or doesn't belong to your account", 404);
      if (!agent.vapi_assistant_id) return errorResponse("Agent has not been synced yet. Please sync in the dashboard first.");

      // Get a phone number for the tenant
      const { data: phoneNum } = await admin
        .from("phone_numbers")
        .select("id, phone_number, vapi_phone_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .limit(1)
        .single();

      if (!phoneNum || !phoneNum.vapi_phone_id) {
        return errorResponse("No active phone number found. Please configure one in the dashboard.");
      }

      // Launch call via VAPI
      const vapiKey = Deno.env.get("VAPI_API_KEY");
      if (!vapiKey) return errorResponse("Voice service not configured", 500);

      const vapiResp = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantId: agent.vapi_assistant_id,
          phoneNumberId: phoneNum.vapi_phone_id,
          customer: { number: phone_number, name: contact_name || undefined },
        }),
      });

      const vapiData = await vapiResp.json();
      if (!vapiResp.ok) {
        return errorResponse(`Failed to trigger call: ${vapiData.message || JSON.stringify(vapiData)}`, 502);
      }

      // Log the call
      await admin.from("calls").insert({
        tenant_id: tenantId,
        agent_id,
        vapi_call_id: vapiData.id,
        from_number: phoneNum.phone_number,
        to_number: phone_number,
        contact_name: contact_name || null,
        phone_number_id: phoneNum.id,
        direction: "outbound",
        started_at: new Date().toISOString(),
      });

      return jsonResponse({
        success: true,
        call_id: vapiData.id,
        message: "Call triggered successfully",
      }, 201);
    }

    // --- AGENTS (read-only) ---
    if (path === "/agents" && method === "GET") {
      const { data, error } = await admin
        .from("agents")
        .select("id, agent_name, description, status, voice_name, total_calls, success_rate")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("agent_name");

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ agents: data });
    }

    return errorResponse(`Unknown endpoint: ${method} ${path}. Available: GET/POST /contacts, GET /calls, GET /calls/:id, POST /calls/trigger, GET /agents`, 404);

  } catch (err) {
    console.error("public-api error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal server error", 500);
  }
});

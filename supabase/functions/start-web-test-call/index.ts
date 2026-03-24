import { getAuthContext } from "../_shared/auth-helpers.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsH = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsH });
  }

  try {
    const { tenantId: tenant_id } = await getAuthContext(req);
    const { agent_id, contact_name } = await req.json();

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id is required" }), {
        status: 400,
        headers: { ...corsH, "Content-Type": "application/json" },
      });
    }

    // Fetch agent
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: agent, error: agentErr } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsH, "Content-Type": "application/json" },
      });
    }

    if (!agent.vapi_assistant_id) {
      return new Response(
        JSON.stringify({
          error:
            "Agent has not been synced yet. Please save the agent first, then try again.",
        }),
        {
          status: 400,
          headers: { ...corsH, "Content-Type": "application/json" },
        }
      );
    }

    // Create a VAPI web call using the API
    const result = await vapiRequest<{
      id: string;
      webCallUrl: string;
      status: string;
    }>({
      method: "POST",
      endpoint: "/call/web",
      body: {
        assistantId: agent.vapi_assistant_id,
        assistantOverrides: {
          firstMessage: (agent.greeting_script || "Hello!")
            .replace(/\[Contact Name\]/gi, contact_name || "there")
            .replace(/\[Agent Name\]/gi, agent.agent_name || "")
            .replace(/\[Company\]/gi, agent.company_name_override || ""),
          metadata: {
            benefitpath_tenant_id: tenant_id,
            benefitpath_agent_id: agent_id,
            benefitpath_is_test_call: true,
            benefitpath_contact_name: contact_name || "Test Caller",
          },
        },
      },
    });

    if (!result.ok || !result.data) {
      console.error("VAPI web call creation failed:", result.error);
      return new Response(
        JSON.stringify({
          error: "Failed to create voice test call. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsH, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        call_id: result.data.id,
        web_call_url: result.data.webCallUrl,
      }),
      {
        headers: { ...corsH, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("start-web-test-call error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsH, "Content-Type": "application/json" },
      }
    );
  }
});

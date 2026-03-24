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

    // Credit balance check — voice tests cost real money
    const { data: tenantRow } = await supabaseAdmin
      .from("tenants")
      .select("company_name, recording_enabled, credit_balance")
      .eq("id", tenant_id)
      .single();

    if ((tenantRow?.credit_balance ?? 0) <= 0) {
      return new Response(
        JSON.stringify({ error: "Insufficient credit balance. Please add credits to continue." }),
        { status: 429, headers: { ...corsH, "Content-Type": "application/json" } }
      );
    }

    let vapiAssistantId = agent.vapi_assistant_id;

    // Auto-sync: create VAPI assistant if not yet synced
    if (!vapiAssistantId) {
      const VOICE_MAP: Record<string, string> = {
        aria: "EXAVITQu4vr4xnSDxMaL", marcus: "nPczCjzI2devNBz1zQrb",
        elena: "Xb7hH8MSUJpSbSDYk0k2", devon: "N2lVS1w4EtoT3dr4eOWO",
        nina: "cgSgspJ2msm6clMCkdW9", carter: "JBFqnCBsd6RMkjVDRZzb",
      };
      const vid = agent.voice_id || "EXAVITQu4vr4xnSDxMaL";
      const resolvedVid = VOICE_MAP[vid.toLowerCase()] || vid;

      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/vapi-webhook`;
      const createResult = await vapiRequest<{ id: string }>({
        method: "POST",
        endpoint: "/assistant",
        body: {
          name: `${tenantRow?.company_name ?? "Agent"} — ${agent.agent_name}`.slice(0, 40),
          model: {
            provider: "openai", model: "gpt-4o",
            messages: [{ role: "system", content: agent.compiled_system_prompt || `You are ${agent.agent_name}, a professional voice agent.` }],
            temperature: 0.7, maxTokens: 1000,
          },
          voice: {
            provider: agent.voice_provider === "eleven_labs" ? "11labs" : (agent.voice_provider || "11labs"),
            voiceId: resolvedVid,
            speed: agent.speaking_speed || 1.0,
          },
          firstMessage: agent.greeting_script,
          silenceTimeoutSeconds: agent.silence_timeout_seconds || 15,
          maxDurationSeconds: (agent.max_call_duration_minutes || 10) * 60,
          recordingEnabled: agent.record_calls ?? tenantRow?.recording_enabled ?? true,
          serverUrl: webhookUrl,
          serverUrlSecret: Deno.env.get("VAPI_WEBHOOK_SECRET"),
          metadata: {
            benefitpath_tenant_id: tenant_id,
            benefitpath_agent_id: agent_id,
            environment: "production",
          },
        },
      });

      if (!createResult.ok || !createResult.data?.id) {
        console.error("Auto-sync failed:", createResult.error);
        return new Response(
          JSON.stringify({ error: "Agent could not be synced. Please edit and re-save the agent, then try again." }),
          { status: 400, headers: { ...corsH, "Content-Type": "application/json" } }
        );
      }

      vapiAssistantId = createResult.data.id;
      await supabaseAdmin
        .from("agents")
        .update({
          vapi_assistant_id: vapiAssistantId,
          vapi_sync_status: "synced",
          vapi_last_synced_at: new Date().toISOString(),
          vapi_sync_error: null,
        })
        .eq("id", agent_id);
    }

    // Return the assistant ID and public key — the VAPI Web SDK on the client
    // will create and join the web call directly using these.
    const vapiPublicKey = Deno.env.get("VAPI_PUBLIC_KEY");
    if (!vapiPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPI_PUBLIC_KEY is not configured" }),
        { status: 500, headers: { ...corsH, "Content-Type": "application/json" } }
      );
    }

    // Personalize greeting for the client to pass as override
    const personalizedGreeting = (agent.greeting_script || "Hello!")
      .replace(/\[Contact Name\]/gi, contact_name || "there")
      .replace(/\[Agent Name\]/gi, agent.agent_name || "")
      .replace(/\[Company\]/gi, agent.company_name_override || "");

    return new Response(
      JSON.stringify({
        vapi_assistant_id: vapiAssistantId,
        vapi_public_key: vapiPublicKey,
        greeting: personalizedGreeting,
        metadata: {
          benefitpath_tenant_id: tenant_id,
          benefitpath_agent_id: agent_id,
          benefitpath_is_test_call: true,
          benefitpath_contact_name: contact_name || "Test Caller",
        },
      }),
      { headers: { ...corsH, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("start-web-test-call error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsH, "Content-Type": "application/json" } }
    );
  }
});

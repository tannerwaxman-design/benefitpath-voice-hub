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

    const body = await req.json();
    const { agent_id, updates } = body;

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id is required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch existing agent (RLS ensures tenant isolation)
    const { data: agent, error: fetchErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (fetchErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: corsHeaders });
    }

    // Update in DB
    const { data: updatedAgent, error: updateErr } = await supabase
      .from("agents")
      .update({ ...updates, vapi_sync_status: "outdated" })
      .eq("id", agent_id)
      .select()
      .single();

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: corsHeaders });
    }

    // If agent has a VAPI assistant, sync changes
    if (agent.vapi_assistant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", agent.tenant_id)
        .single();

      // Recompile system prompt with merged data
      const merged = { ...agent, ...updates };
      const companyName = merged.company_name_override || tenant?.company_name || "";
      let prompt = `You are ${merged.agent_name}`;
      if (merged.agent_title) prompt += `, a ${merged.agent_title}`;
      prompt += ` at ${companyName}.\n\nTone: ${merged.tone}. Enthusiasm: ${merged.enthusiasm_level}/10.\n`;
      if (merged.knowledge_base_text) prompt += `\n## Knowledge Base\n${merged.knowledge_base_text}\n`;

      const vapiUpdate: any = {
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.7,
        },
        voice: {
          provider: merged.voice_provider === "eleven_labs" ? "11labs" : merged.voice_provider,
          voiceId: merged.voice_id,
          speed: merged.speaking_speed,
        },
        firstMessage: merged.greeting_script,
        silenceTimeoutSeconds: merged.silence_timeout_seconds,
        maxDurationSeconds: merged.max_call_duration_minutes * 60,
      };

      const vapiRes = await fetch(`${VAPI_BASE_URL}/assistant/${agent.vapi_assistant_id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vapiUpdate),
      });

      if (vapiRes.ok) {
        await supabase.from("agents").update({
          vapi_sync_status: "synced",
          vapi_last_synced_at: new Date().toISOString(),
          vapi_sync_error: null,
        }).eq("id", agent_id);
      } else {
        const errText = await vapiRes.text();
        await supabase.from("agents").update({
          vapi_sync_status: "error",
          vapi_sync_error: errText,
        }).eq("id", agent_id);
      }
    }

    return new Response(JSON.stringify(updatedAgent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

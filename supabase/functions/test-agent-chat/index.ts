import {
  getAuthContext,
  corsHeaders,
  errorResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { compileSystemPrompt } from "../_shared/prompt-compiler.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const { tenantId: tenant_id } = await getAuthContext(req);
    const { agent_id, messages, simulate_as } = await req.json();

    if (!agent_id) return errorResponse("agent_id is required", 400);

    const supabase = createAdminClient();

    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .eq("tenant_id", tenant_id)
      .single();
    if (agentErr || !agent) return errorResponse("Agent not found", 404);

    // Fetch tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenant_id)
      .single();
    if (tenantErr || !tenant) return errorResponse("Tenant not found", 404);

    // Compile system prompt (same as real calls)
    const systemPrompt = compileSystemPrompt(
      {
        agent_name: agent.agent_name,
        agent_title: agent.agent_title,
        company_name_override: agent.company_name_override,
        tone: agent.tone,
        enthusiasm_level: agent.enthusiasm_level,
        filler_words_enabled: agent.filler_words_enabled,
        call_objective: agent.call_objective,
        conversation_stages: agent.conversation_stages as any[] || [],
        objection_handling: agent.objection_handling as any[] || [],
        knowledge_base_text: agent.knowledge_base_text,
        faq_pairs: agent.faq_pairs as any[] || [],
        transfer_enabled: !!agent.transfer_phone_number,
        transfer_triggers: agent.transfer_triggers as string[] || [],
        transfer_announcement: agent.transfer_announcement,
        closing_script: agent.closing_script,
        voicemail_enabled: agent.voicemail_enabled,
        voicemail_script: agent.voicemail_script,
        require_verbal_consent: agent.require_verbal_consent,
        consent_script_override: agent.consent_script,
        recording_enabled_override: agent.record_calls,
        recording_disclosure_override: agent.disclosure_script,
        primary_cta: agent.primary_cta,
        fallback_cta: agent.fallback_cta,
        soa_enabled: agent.soa_enabled,
        soa_script: agent.soa_script,
        soa_plan_types: agent.soa_plan_types as string[] || [],
        soa_timing: agent.soa_timing,
      },
      {
        company_name: tenant.company_name || "Our Company",
        industry: tenant.industry || "Insurance",
        recording_disclosure_enabled: true,
        recording_disclosure_text: "This call may be recorded for quality purposes.",
        require_consent: false,
        consent_script: null,
      }
    );

    // Add simulation context
    let fullSystem = systemPrompt;
    const contactName = simulate_as?.name || "the caller";

    fullSystem += `\n\n## TEST SIMULATION CONTEXT\nYou are in a text-based test chat. Respond as if you are on a phone call. The person you are speaking with is named ${contactName}. Keep responses concise (1-3 sentences, like a real phone conversation). Do NOT use markdown formatting.`;

    if (simulate_as?.mood && simulate_as.mood !== "neutral") {
      const moodNotes: Record<string, string> = {
        interested: "The caller is eager and asking questions. They seem genuinely interested.",
        skeptical: "The caller pushes back and asks tough questions. They are skeptical but not hostile.",
        busy: "The caller is busy and impatient. They give short answers.",
        hostile: 'The caller is irritated. They may say "stop calling me" or question legitimacy.',
      };
      fullSystem += `\n[SIMULATION: ${moodNotes[simulate_as.mood] || ""}]`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("AI service not configured", 500);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: fullSystem },
            ...messages,
          ],
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return errorResponse("AI service error", 500);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("test-agent-chat error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

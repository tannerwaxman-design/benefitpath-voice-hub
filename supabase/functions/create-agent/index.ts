import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

function compileSystemPrompt(agent: any, tenant: any): string {
  const companyName = agent.company_name_override || tenant.company_name;
  let prompt = `You are ${agent.agent_name}`;
  if (agent.agent_title) prompt += `, a ${agent.agent_title}`;
  prompt += ` at ${companyName}.\n\n`;

  // Tone
  prompt += `## Communication Style\n`;
  prompt += `Tone: ${agent.tone}. Enthusiasm: ${agent.enthusiasm_level}/10.\n`;
  if (agent.filler_words_enabled) prompt += `Use natural filler words occasionally to sound human.\n`;
  prompt += `Interruption style: ${agent.interruption_handling}.\n\n`;

  // Objective
  prompt += `## Call Objective\nYour primary objective is: ${agent.call_objective.replace(/_/g, " ")}.\n`;
  prompt += `Primary CTA: ${agent.primary_cta.replace(/_/g, " ")}. Fallback CTA: ${agent.fallback_cta?.replace(/_/g, " ") || "send email"}.\n\n`;

  // Conversation stages
  if (agent.conversation_stages && Array.isArray(agent.conversation_stages) && agent.conversation_stages.length > 0) {
    prompt += `## Conversation Flow\nFollow these stages in order:\n`;
    for (const stage of agent.conversation_stages) {
      prompt += `\n### ${stage.name}\n${stage.script || ""}\n`;
      if (stage.questions?.length) {
        prompt += `Ask these questions:\n`;
        for (const q of stage.questions) prompt += `- ${q}\n`;
      }
    }
    prompt += "\n";
  }

  // Objection handling
  if (agent.objection_handling && Array.isArray(agent.objection_handling) && agent.objection_handling.length > 0) {
    prompt += `## Objection Handling\n`;
    for (const obj of agent.objection_handling) {
      prompt += `If they say "${obj.objection}": ${obj.response}\n`;
    }
    prompt += "\n";
  }

  // Knowledge base
  if (agent.knowledge_base_text) {
    prompt += `## Knowledge Base\n${agent.knowledge_base_text}\n\n`;
  }

  // FAQ
  if (agent.faq_pairs && Array.isArray(agent.faq_pairs) && agent.faq_pairs.length > 0) {
    prompt += `## Frequently Asked Questions\n`;
    for (const faq of agent.faq_pairs) {
      prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }
  }

  // Closing
  if (agent.closing_script) {
    prompt += `## Closing Script\n${agent.closing_script}\n\n`;
  }

  // Compliance
  if (agent.respect_dnc) {
    prompt += `## Compliance\nIf the caller asks to be placed on a do-not-call list or says "stop calling me", immediately comply, end the call politely, and note the DNC request.\n`;
  }
  if (agent.require_verbal_consent && agent.consent_script) {
    prompt += `Before proceeding with the call, ask for consent: "${agent.consent_script}"\n`;
  }

  return prompt;
}

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

    // Get tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!tenantUser || !["admin", "manager"].includes(tenantUser.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantUser.tenant_id)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404, headers: corsHeaders });
    }

    // Save agent to DB first
    const agentData = {
      tenant_id: tenantUser.tenant_id,
      agent_name: body.agent_name,
      agent_title: body.agent_title || null,
      company_name_override: body.company_name_override || null,
      industry: body.industry || tenant.industry,
      description: body.description || null,
      status: body.status || "draft",
      voice_provider: body.voice_provider || "eleven_labs",
      voice_id: body.voice_id || "aria",
      voice_name: body.voice_name || null,
      speaking_speed: body.speaking_speed || 1.0,
      tone: body.tone || "professional",
      enthusiasm_level: body.enthusiasm_level || 6,
      filler_words_enabled: body.filler_words_enabled ?? true,
      background_noise: body.background_noise || "none",
      interruption_handling: body.interruption_handling || "balanced",
      language: body.language || "en-US",
      greeting_script: body.greeting_script,
      call_objective: body.call_objective || "appointment_setting",
      conversation_stages: body.conversation_stages || [],
      objection_handling: body.objection_handling || [],
      closing_script: body.closing_script || null,
      voicemail_script: body.voicemail_script || null,
      voicemail_enabled: body.voicemail_enabled ?? true,
      voicemail_after_attempt: body.voicemail_after_attempt || 2,
      primary_cta: body.primary_cta || "book_appointment",
      fallback_cta: body.fallback_cta || "send_email",
      knowledge_base_text: body.knowledge_base_text || null,
      faq_pairs: body.faq_pairs || [],
      max_concurrent_calls: body.max_concurrent_calls || 5,
      delay_between_calls_seconds: body.delay_between_calls_seconds || 3,
      max_calls_per_contact_per_day: body.max_calls_per_contact_per_day || 2,
      max_attempts_per_contact: body.max_attempts_per_contact || 4,
      hours_between_retries: body.hours_between_retries || 24,
      cooloff_days_not_interested: body.cooloff_days_not_interested || 30,
      max_call_duration_minutes: body.max_call_duration_minutes || 10,
      silence_timeout_seconds: body.silence_timeout_seconds || 15,
      amd_enabled: body.amd_enabled ?? true,
      amd_action: body.amd_action || "leave_voicemail",
      business_hours: body.business_hours || {},
      timezone: body.timezone || tenant.default_timezone,
      transfer_triggers: body.transfer_triggers || ["human_requested"],
      transfer_method: body.transfer_method || "warm",
      transfer_phone_number: body.transfer_phone_number || null,
      transfer_announcement: body.transfer_announcement || null,
      transfer_timeout_seconds: body.transfer_timeout_seconds || 30,
      record_calls: body.record_calls ?? tenant.recording_enabled,
      play_disclosure: body.play_disclosure ?? tenant.recording_disclosure_enabled,
      disclosure_script: body.disclosure_script || tenant.recording_disclosure_text,
      vapi_sync_status: "pending",
    };

    const { data: agent, error: insertErr } = await supabase
      .from("agents")
      .insert(agentData)
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
    }

    // Compile system prompt and create VAPI assistant
    const systemPrompt = compileSystemPrompt(agent, tenant);

    const vapiPayload: any = {
      name: `${tenant.company_name} - ${agent.agent_name}`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.7,
      },
      voice: {
        provider: agent.voice_provider === "eleven_labs" ? "11labs" : agent.voice_provider,
        voiceId: agent.voice_id,
        speed: agent.speaking_speed,
      },
      firstMessage: agent.greeting_script,
      firstMessageInterruptionsEnabled: false,
      firstMessageMode: "assistant-speaks-first",
      recordingEnabled: agent.record_calls,
      endCallFunctionEnabled: true,
      silenceTimeoutSeconds: agent.silence_timeout_seconds,
      maxDurationSeconds: agent.max_call_duration_minutes * 60,
      voicemailDetection: {
        enabled: agent.amd_enabled,
        provider: "twilio",
      },
      serverUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/vapi-webhook`,
      metadata: {
        tenant_id: tenantUser.tenant_id,
        agent_id: agent.id,
        environment: "production",
      },
    };

    // Add transfer tool if configured
    if (agent.transfer_phone_number) {
      vapiPayload.tools = [{
        type: "transferCall",
        destinations: [{
          type: "number",
          number: agent.transfer_phone_number,
          message: agent.transfer_announcement || "Connecting you now...",
        }],
      }];
    }

    const vapiRes = await fetch(`${VAPI_BASE_URL}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiPayload),
    });

    if (!vapiRes.ok) {
      const vapiErr = await vapiRes.text();
      // Update agent with error
      await supabase.from("agents").update({
        vapi_sync_status: "error",
        vapi_sync_error: vapiErr,
      }).eq("id", agent.id);

      return new Response(JSON.stringify({ error: "VAPI sync failed", details: vapiErr, agent_id: agent.id }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapiAssistant = await vapiRes.json();

    // Update agent with VAPI ID
    await supabase.from("agents").update({
      vapi_assistant_id: vapiAssistant.id,
      vapi_sync_status: "synced",
      vapi_last_synced_at: new Date().toISOString(),
      vapi_sync_error: null,
    }).eq("id", agent.id);

    return new Response(JSON.stringify({ ...agent, vapi_assistant_id: vapiAssistant.id, vapi_sync_status: "synced" }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

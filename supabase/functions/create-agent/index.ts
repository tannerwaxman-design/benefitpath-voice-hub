import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

// ============================================
// SYSTEM PROMPT COMPILER
// Takes all agent config + tenant info and builds
// one comprehensive system prompt for VAPI's LLM
// ============================================

function formatObjective(objective: string): string {
  const map: Record<string, string> = {
    appointment_setting: "Schedule an appointment with a benefits advisor",
    lead_qualification: "Qualify the lead and determine their level of interest",
    enrollment_followup: "Follow up on benefits enrollment status",
    policy_renewal: "Remind about and facilitate policy renewal",
    survey: "Conduct a satisfaction or feedback survey",
    payment_reminder: "Remind about an upcoming or overdue payment",
    general_info: "Provide general information about benefits and services",
    custom: "Complete the custom objective defined by the caller's needs",
  };
  return map[objective] || objective.replace(/_/g, " ");
}

function formatCTA(cta: string): string {
  const map: Record<string, string> = {
    book_appointment: "Book an appointment",
    confirm_enrollment: "Confirm enrollment details",
    collect_info: "Collect contact information for follow-up",
    transfer: "Transfer to a live agent",
    send_email: "Offer to send detailed information via email",
    custom: "Complete the custom action",
  };
  return map[cta] || cta.replace(/_/g, " ");
}

function formatTrigger(trigger: string): string {
  const map: Record<string, string> = {
    human_requested: "The caller explicitly asks to speak with a human",
    high_intent: "The caller shows high buying intent (e.g., 'I want to sign up', 'How do I enroll?')",
    frustrated: "The caller becomes frustrated, angry, or raises their voice",
    cannot_answer: "You cannot answer a question after 2 attempts",
    competitor_mention: "The caller mentions a competitor by name",
    sensitive_topic: "The caller discusses sensitive medical details or legal concerns",
  };
  return map[trigger] || trigger.replace(/_/g, " ");
}

function compileSystemPrompt(agent: any, tenant: any): string {
  const companyName = agent.company_name_override || tenant.company_name;

  let prompt = `You are ${agent.agent_name}`;
  if (agent.agent_title) prompt += `, a ${agent.agent_title}`;
  prompt += ` at ${companyName}.`;

  prompt += `\n\nYour tone is ${agent.tone}. `;

  if (agent.filler_words_enabled) {
    prompt += `Use natural filler words occasionally (um, let me think, well) to sound more human. `;
  }

  prompt += `Your enthusiasm level is ${agent.enthusiasm_level}/10. `;

  if (agent.interruption_handling === "patient") {
    prompt += `Be patient — wait for complete silence before responding. `;
  } else if (agent.interruption_handling === "responsive") {
    prompt += `Be responsive — reply quickly when you detect the caller has paused. `;
  } else {
    prompt += `Let the caller finish speaking, then respond naturally. `;
  }

  // Call objective
  prompt += `\n\n## YOUR OBJECTIVE\n`;
  prompt += `Your primary goal for this call is: ${formatObjective(agent.call_objective)}. `;
  prompt += `Primary CTA: ${formatCTA(agent.primary_cta)}. `;
  prompt += `If that fails, your fallback is: ${formatCTA(agent.fallback_cta || "send_email")}.\n`;

  // Conversation stages
  const stages = agent.conversation_stages;
  if (stages && Array.isArray(stages) && stages.length > 0) {
    prompt += `\n## CONVERSATION FLOW\nFollow these stages in order:\n`;
    for (const stage of stages) {
      prompt += `\n### ${stage.name}\n${stage.script || ""}\n`;
      if (stage.questions && stage.questions.length > 0) {
        prompt += `Ask these questions:\n`;
        for (const q of stage.questions) {
          prompt += `- ${q}\n`;
        }
      }
    }
  }

  // Objection handling
  const objections = agent.objection_handling;
  if (objections && Array.isArray(objections) && objections.length > 0) {
    prompt += `\n## OBJECTION HANDLING\n`;
    prompt += `When the caller raises objections, respond as follows:\n`;
    for (const obj of objections) {
      prompt += `\nIf they say "${obj.objection}": ${obj.response}\n`;
    }
  }

  // Knowledge base
  if (agent.knowledge_base_text) {
    prompt += `\n## COMPANY KNOWLEDGE BASE\nUse this information to answer questions:\n`;
    prompt += agent.knowledge_base_text + "\n";
  }

  // FAQ
  const faqs = agent.faq_pairs;
  if (faqs && Array.isArray(faqs) && faqs.length > 0) {
    prompt += `\n## FREQUENTLY ASKED QUESTIONS\n`;
    for (const faq of faqs) {
      prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
    }
  }

  // Transfer rules
  const triggers = agent.transfer_triggers;
  if (agent.transfer_phone_number && triggers && Array.isArray(triggers) && triggers.length > 0) {
    prompt += `\n## WHEN TO TRANSFER TO A HUMAN\n`;
    prompt += `Transfer the call to a live agent when:\n`;
    for (const trigger of triggers) {
      prompt += `- ${formatTrigger(trigger)}\n`;
    }
    if (agent.transfer_announcement) {
      prompt += `Before transferring, say: "${agent.transfer_announcement}"\n`;
    }
  }

  // Compliance rules
  prompt += `\n## COMPLIANCE RULES (ALWAYS FOLLOW THESE)\n`;
  if (tenant.recording_disclosure_enabled || agent.play_disclosure) {
    prompt += `- If asked about recording: "${agent.disclosure_script || tenant.recording_disclosure_text || "This call may be recorded for quality and training purposes."}"\n`;
  }
  if (agent.require_verbal_consent) {
    prompt += `- Before proceeding with the call, get verbal consent: "${agent.consent_script || tenant.consent_script || "Do you consent to receiving information about your benefits options?"}"\n`;
  }
  prompt += `- If the caller says "stop calling", "do not call", "remove me", or anything similar, IMMEDIATELY comply. Say "I understand, I'll make sure you're removed from our call list. I apologize for the inconvenience. Have a good day." Then end the call.\n`;
  prompt += `- NEVER provide medical, legal, or financial advice.\n`;
  prompt += `- NEVER make guarantees about coverage, pricing, or eligibility.\n`;
  prompt += `- Always identify yourself honestly as calling on behalf of ${companyName}.\n`;

  // Closing
  if (agent.closing_script) {
    prompt += `\n## CLOSING THE CALL\nWhen wrapping up, say something like: "${agent.closing_script}"\n`;
  }

  // Voicemail
  if (agent.voicemail_enabled && agent.voicemail_script) {
    prompt += `\n## VOICEMAIL\nIf you reach voicemail, leave this message: "${agent.voicemail_script}"\n`;
  }

  return prompt;
}

// ============================================
// EDGE FUNCTION: create-agent
// ============================================

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

    // Build agent data
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
      warning_before_max_duration: body.warning_before_max_duration ?? true,
      amd_enabled: body.amd_enabled ?? true,
      amd_action: body.amd_action || "leave_voicemail",
      business_hours: body.business_hours || {},
      timezone: body.timezone || tenant.default_timezone,
      transfer_triggers: body.transfer_triggers || ["human_requested"],
      transfer_method: body.transfer_method || "warm",
      transfer_phone_number: body.transfer_phone_number || null,
      backup_transfer_number: body.backup_transfer_number || null,
      transfer_announcement: body.transfer_announcement || "I'm going to connect you with one of our specialists. Please hold for just a moment.",
      transfer_timeout_seconds: body.transfer_timeout_seconds || 30,
      if_no_human: body.if_no_human || "take_message",
      record_calls: body.record_calls ?? tenant.recording_enabled,
      play_disclosure: body.play_disclosure ?? tenant.recording_disclosure_enabled,
      disclosure_script: body.disclosure_script || tenant.recording_disclosure_text,
      disclosure_timing: body.disclosure_timing || "before_greeting",
      require_verbal_consent: body.require_verbal_consent ?? false,
      consent_script: body.consent_script || null,
      respect_dnc: true, // Always true, cannot be disabled
      vapi_sync_status: "pending",
    };

    // Insert agent
    const { data: agent, error: insertErr } = await supabase
      .from("agents")
      .insert(agentData)
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
    }

    // Compile system prompt
    const compiledPrompt = compileSystemPrompt(agent, tenant);

    // Store compiled prompt
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("agents").update({ compiled_system_prompt: compiledPrompt }).eq("id", agent.id);

    // Create VAPI assistant
    const vapiPayload: any = {
      name: `${tenant.company_name} - ${agent.agent_name}`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: compiledPrompt }],
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
          message: agent.transfer_announcement,
        }],
      }];
    }

    // Add voicemail message if configured
    if (agent.voicemail_enabled && agent.voicemail_script) {
      vapiPayload.voicemailMessage = agent.voicemail_script;
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
      await serviceClient.from("agents").update({
        vapi_sync_status: "error",
        vapi_sync_error: vapiErr,
      }).eq("id", agent.id);

      return new Response(JSON.stringify({ error: "Voice engine sync failed", details: vapiErr, agent_id: agent.id }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapiAssistant = await vapiRes.json();

    // Update agent with VAPI ID
    await serviceClient.from("agents").update({
      vapi_assistant_id: vapiAssistant.id,
      vapi_sync_status: "synced",
      vapi_last_synced_at: new Date().toISOString(),
      vapi_sync_error: null,
    }).eq("id", agent.id);

    return new Response(JSON.stringify({
      ...agent,
      vapi_assistant_id: vapiAssistant.id,
      vapi_sync_status: "synced",
      compiled_system_prompt: compiledPrompt,
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

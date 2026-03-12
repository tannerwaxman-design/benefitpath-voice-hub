import { getAuthContext, corsHeaders, errorResponse, successResponse } from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { compileSystemPrompt } from "../_shared/prompt-compiler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const auth = await getAuthContext(req).catch((e) =>
      null
    );

    if (!auth) return errorResponse("Unauthorized", 401);
    if (!["admin", "manager"].includes(auth.role)) return errorResponse("Forbidden", 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const body = await req.json();

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", auth.tenantId)
      .single();

    if (!tenant) return errorResponse("Tenant not found", 404);

    // Build agent data
    const agentData = {
      tenant_id: auth.tenantId,
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
      respect_dnc: true,
      vapi_sync_status: "pending",
    };

    // Insert agent
    const { data: agent, error: insertErr } = await supabase
      .from("agents")
      .insert(agentData)
      .select()
      .single();

    if (insertErr) return errorResponse(insertErr.message, 400);

    // Compile system prompt using the enhanced compiler
    const promptInput = {
      ...agent,
      transfer_enabled: !!agent.transfer_phone_number,
      consent_script_override: agent.consent_script,
      recording_enabled_override: agent.record_calls,
      recording_disclosure_override: agent.disclosure_script,
    };

    const compiledPrompt = compileSystemPrompt(promptInput, {
      company_name: tenant.company_name,
      industry: tenant.industry,
      recording_disclosure_enabled: tenant.recording_disclosure_enabled,
      recording_disclosure_text: tenant.recording_disclosure_text,
      require_consent: tenant.require_consent,
      consent_script: tenant.consent_script,
    });

    // Store compiled prompt via admin client (bypasses RLS)
    const adminClient = createAdminClient();
    await adminClient.from("agents").update({ compiled_system_prompt: compiledPrompt }).eq("id", agent.id);

    // Create VAPI assistant
    const vapiPayload: Record<string, unknown> = {
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
        tenant_id: auth.tenantId,
        agent_id: agent.id,
        environment: "production",
      },
    };

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

    if (agent.voicemail_enabled && agent.voicemail_script) {
      vapiPayload.voicemailMessage = agent.voicemail_script;
    }

    const vapiRes = await vapiRequest<{ id: string }>({
      method: "POST",
      endpoint: "/assistant",
      body: vapiPayload,
    });

    if (!vapiRes.ok) {
      await adminClient.from("agents").update({
        vapi_sync_status: "error",
        vapi_sync_error: vapiRes.error,
      }).eq("id", agent.id);

      return new Response(JSON.stringify({ error: "Voice engine sync failed", details: vapiRes.error, agent_id: agent.id }), {
        status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // Update agent with VAPI ID
    await adminClient.from("agents").update({
      vapi_assistant_id: vapiRes.data!.id,
      vapi_sync_status: "synced",
      vapi_last_synced_at: new Date().toISOString(),
      vapi_sync_error: null,
    }).eq("id", agent.id);

    return successResponse({
      ...agent,
      vapi_assistant_id: vapiRes.data!.id,
      vapi_sync_status: "synced",
      compiled_system_prompt: compiledPrompt,
    }, 201);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
});

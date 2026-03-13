// ============================================================
// EDGE FUNCTION: create-agent
//
// Called when a user saves a new agent from the Agent Builder UI.
// 1. Validates the input
// 2. Compiles the system prompt from all config fields
// 3. Creates a VAPI assistant via POST /assistant
// 4. Saves the agent to our database with the vapi_assistant_id
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { compileSystemPrompt } from "../_shared/prompt-compiler.ts";
import { insertNotification } from "../_shared/notifications.ts";
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
    // 1. Authenticate and get tenant context
    const auth = await getAuthContext(req);
    const body = await req.json();

    // 2. Create Supabase client with user's JWT (RLS-enforced)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 3. Get tenant info (needed for prompt compilation)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", auth.tenantId)
      .single();

    if (tenantError || !tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // 4. Compile the system prompt
    const promptInput = {
      agent_name: body.agent_name,
      agent_title: body.agent_title || null,
      company_name_override: body.company_name_override || null,
      tone: body.tone || "professional",
      enthusiasm_level: body.enthusiasm_level || 6,
      filler_words_enabled: body.filler_words_enabled ?? true,
      call_objective: body.call_objective || "appointment_setting",
      conversation_stages: body.conversation_stages || [],
      objection_handling: body.objection_handling || [],
      knowledge_base_text: body.knowledge_base_text || null,
      faq_pairs: body.faq_pairs || [],
      transfer_enabled: !!(body.transfer_phone_number),
      transfer_triggers: body.transfer_triggers || ["human_requested", "high_intent", "frustrated"],
      transfer_announcement: body.transfer_announcement || null,
      closing_script: body.closing_script || null,
      voicemail_enabled: body.voicemail_enabled ?? true,
      voicemail_script: body.voicemail_script || null,
      require_verbal_consent: body.require_verbal_consent ?? false,
      consent_script_override: body.consent_script || null,
      recording_enabled_override: body.record_calls ?? null,
      recording_disclosure_override: body.disclosure_script || null,
      primary_cta: body.primary_cta || "book_appointment",
      fallback_cta: body.fallback_cta || "send_email",
    };

    const compiledPrompt = compileSystemPrompt(promptInput, {
      company_name: tenant.company_name,
      industry: tenant.industry,
      recording_disclosure_enabled: tenant.recording_disclosure_enabled,
      recording_disclosure_text: tenant.recording_disclosure_text,
      require_consent: tenant.require_consent,
      consent_script: tenant.consent_script,
    });

    // 5. Determine the webhook URL for this Supabase project
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/vapi-webhook`;

    // 6. Build the VAPI assistant payload
    const vapiPayload: Record<string, unknown> = {
      name: `${tenant.company_name} — ${body.agent_name}${body.agent_title ? " (" + body.agent_title + ")" : ""}`,

      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: compiledPrompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 1000,
      },

      voice: {
        provider: body.voice_provider === "eleven_labs" ? "11labs" : (body.voice_provider || "11labs"),
        voiceId: body.voice_id || "aria",
        speed: body.speaking_speed || 1.0,
        ...(body.filler_words_enabled && {
          fillerInjectionEnabled: true,
        }),
      },

      firstMessage: body.greeting_script,
      firstMessageInterruptionsEnabled: false,
      firstMessageMode: "assistant-speaks-first",

      silenceTimeoutSeconds: body.silence_timeout_seconds || 15,
      maxDurationSeconds: (body.max_call_duration_minutes || 10) * 60,
      recordingEnabled: body.record_calls ?? tenant.recording_enabled,

      voicemailMessage: body.voicemail_enabled ? body.voicemail_script : null,
      voicemailDetection: {
        enabled: body.voicemail_enabled ?? true,
        provider: "twilio",
      },

      serverUrl: webhookUrl,
      serverUrlSecret: Deno.env.get("VAPI_WEBHOOK_SECRET"),
      serverMessages: [
        "end-of-call-report",
        "status-update",
        "transcript",
        "transfer-destination-request",
      ],

      metadata: {
        benefitpath_tenant_id: auth.tenantId,
        benefitpath_agent_id: "PLACEHOLDER",
        environment: "production",
      },

      analysisPlan: {
        summaryPlan: {
          enabled: true,
          messages: [
            {
              role: "system",
              content:
                "Summarize this call in 2-3 sentences. Include: who was called, the purpose, the outcome, and any follow-up actions needed.",
            },
          ],
        },
        successEvaluationPlan: {
          enabled: true,
          rubric: "AutomaticRubric",
          messages: [
            {
              role: "system",
              content: `Evaluate if this call achieved its objective: ${body.call_objective || "appointment_setting"}. Rate as "successful", "partial", or "unsuccessful".`,
            },
          ],
        },
      },

      ...(body.background_noise &&
        body.background_noise !== "none" && {
          backgroundSound: body.background_noise === "office" ? "office" : "off",
        }),

      endCallPhrases: [
        "stop calling me",
        "do not call",
        "remove my number",
        "take me off your list",
        "don't call again",
      ],
    };

    // 7. Add transfer tool if enabled
    if (body.transfer_phone_number) {
      vapiPayload.tools = [
        {
          type: "transferCall",
          messages: [
            {
              type: "request-start",
              content:
                body.transfer_announcement ||
                "Let me connect you with one of our specialists. Please hold for just a moment.",
            },
          ],
          destinations: [
            {
              type: "number",
              number: body.transfer_phone_number,
              message:
                body.transfer_announcement ||
                "Connecting you now...",
            },
          ],
        },
      ];
    }

    // 8. Create the VAPI assistant
    const vapiResult = await vapiRequest<{ id: string }>({
      method: "POST",
      endpoint: "/assistant",
      body: vapiPayload,
    });

    if (!vapiResult.ok) {
      console.error("Failed to create VAPI assistant:", vapiResult.error);
    }

    const vapiAssistantId = vapiResult.data?.id ?? null;

    // 9. Save the agent to our database
    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        tenant_id: auth.tenantId,
        vapi_assistant_id: vapiAssistantId,
        vapi_sync_status: vapiResult.ok ? "synced" : "error",
        vapi_last_synced_at: vapiResult.ok ? new Date().toISOString() : null,
        vapi_sync_error: vapiResult.ok ? null : vapiResult.error,

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
        knowledge_base_urls: body.knowledge_base_urls || [],
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

        transfer_triggers: body.transfer_triggers || ["human_requested", "high_intent", "frustrated"],
        transfer_method: body.transfer_method || "warm",
        transfer_phone_number: body.transfer_phone_number || null,
        backup_transfer_number: body.backup_transfer_number || null,
        transfer_announcement: body.transfer_announcement || null,
        transfer_timeout_seconds: body.transfer_timeout_seconds || 30,
        if_no_human: body.if_no_human || "take_message",

        record_calls: body.record_calls ?? tenant.recording_enabled,
        play_disclosure: body.play_disclosure ?? tenant.recording_disclosure_enabled,
        disclosure_script: body.disclosure_script || tenant.recording_disclosure_text,
        disclosure_timing: body.disclosure_timing || "before_greeting",
        require_verbal_consent: body.require_verbal_consent ?? false,
        consent_script: body.consent_script || null,
        respect_dnc: true,

        compiled_system_prompt: compiledPrompt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert agent:", insertError);
      // If DB insert fails but VAPI succeeded, clean up VAPI
      if (vapiAssistantId) {
        await vapiRequest({
          method: "DELETE",
          endpoint: `/assistant/${vapiAssistantId}`,
        });
      }
      return errorResponse("Failed to save agent: " + insertError.message, 500);
    }

    // 10. Update VAPI assistant metadata with the real agent_id
    if (vapiAssistantId && agent) {
      await vapiRequest({
        method: "PATCH",
        endpoint: `/assistant/${vapiAssistantId}`,
        body: {
          metadata: {
            benefitpath_tenant_id: auth.tenantId,
            benefitpath_agent_id: agent.id,
            environment: "production",
          },
        },
      });
    }

    // 11. Send notification about sync result
    const adminClient = createAdminClient();
    if (!vapiResult.ok) {
      await insertNotification(adminClient, auth.tenantId, {
        type: "error",
        title: "Agent sync failed",
        body: `"${body.agent_name}" was saved but couldn't sync with the voice engine.`,
        icon: "warning",
        link: "/agents",
      });
    }

    return successResponse({
      agent,
      vapi_synced: vapiResult.ok,
      message: vapiResult.ok
        ? "Agent created and synced with voice engine"
        : "Agent saved but voice sync failed. You can retry from settings.",
    });
  } catch (err) {
    console.error("create-agent error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

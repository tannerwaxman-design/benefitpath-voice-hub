// ============================================================
// EDGE FUNCTION: update-agent
//
// Called when a user edits an existing agent in the Agent Builder.
// Updates our DB AND pushes changes to VAPI via PATCH /assistant
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
    const auth = await getAuthContext(req);
    const body = await req.json();
    const agentId = body.agent_id;

    if (!agentId) {
      return errorResponse("agent_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get existing agent (RLS ensures tenant isolation)
    const { data: existingAgent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (fetchError || !existingAgent) {
      return errorResponse("Agent not found", 404);
    }

    // Get tenant info for prompt compilation
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", auth.tenantId)
      .single();

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Merge updates with existing agent data
    const updatedConfig = { ...existingAgent, ...body };

    // Recompile system prompt
    const promptInput = {
      agent_name: updatedConfig.agent_name,
      agent_title: updatedConfig.agent_title || null,
      company_name_override: updatedConfig.company_name_override || null,
      tone: updatedConfig.tone || "professional",
      enthusiasm_level: updatedConfig.enthusiasm_level || 6,
      filler_words_enabled: updatedConfig.filler_words_enabled ?? true,
      call_objective: updatedConfig.call_objective || "appointment_setting",
      conversation_stages: updatedConfig.conversation_stages || [],
      objection_handling: updatedConfig.objection_handling || [],
      knowledge_base_text: updatedConfig.knowledge_base_text || null,
      faq_pairs: updatedConfig.faq_pairs || [],
      transfer_enabled: !!updatedConfig.transfer_phone_number,
      transfer_triggers: updatedConfig.transfer_triggers || ["human_requested", "high_intent", "frustrated"],
      transfer_announcement: updatedConfig.transfer_announcement || null,
      closing_script: updatedConfig.closing_script || null,
      voicemail_enabled: updatedConfig.voicemail_enabled ?? true,
      voicemail_script: updatedConfig.voicemail_script || null,
      require_verbal_consent: updatedConfig.require_verbal_consent ?? false,
      consent_script_override: updatedConfig.consent_script || null,
      recording_enabled_override: updatedConfig.record_calls ?? null,
      recording_disclosure_override: updatedConfig.disclosure_script || null,
      primary_cta: updatedConfig.primary_cta || "book_appointment",
      fallback_cta: updatedConfig.fallback_cta || "send_email",
    };

    const compiledPrompt = compileSystemPrompt(promptInput, {
      company_name: tenant.company_name,
      industry: tenant.industry,
      recording_disclosure_enabled: tenant.recording_disclosure_enabled,
      recording_disclosure_text: tenant.recording_disclosure_text,
      require_consent: tenant.require_consent,
      consent_script: tenant.consent_script,
    });

    // Strip agent_id from the update payload (it's not a column to update)
    const { agent_id: _ignored, ...updateFields } = body;

    // Update our database
    const { data: agent, error: updateError } = await supabase
      .from("agents")
      .update({
        ...updateFields,
        compiled_system_prompt: compiledPrompt,
        vapi_sync_status: "outdated",
      })
      .eq("id", agentId)
      .select()
      .single();

    if (updateError) {
      return errorResponse("Failed to update agent: " + updateError.message, 500);
    }

    // Push changes to VAPI if assistant exists
    let vapiSynced = false;
    if (existingAgent.vapi_assistant_id) {
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/vapi-webhook`;

      const vapiUpdate: Record<string, unknown> = {
        name: `${tenant.company_name} — ${updatedConfig.agent_name}`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: compiledPrompt }],
          temperature: 0.7,
          maxTokens: 1000,
        },
        voice: {
          provider: updatedConfig.voice_provider === "eleven_labs" ? "11labs" : (updatedConfig.voice_provider || "11labs"),
          voiceId: updatedConfig.voice_id || "aria",
          speed: updatedConfig.speaking_speed || 1.0,
        },
        firstMessage: updatedConfig.greeting_script,
        silenceTimeoutSeconds: updatedConfig.silence_timeout_seconds || 15,
        maxDurationSeconds: (updatedConfig.max_call_duration_minutes || 10) * 60,
        recordingEnabled: updatedConfig.record_calls ?? tenant.recording_enabled,
        voicemailMessage: updatedConfig.voicemail_enabled
          ? updatedConfig.voicemail_script
          : null,
        voicemailDetection: {
          enabled: updatedConfig.voicemail_enabled ?? true,
          provider: "twilio",
        },
        serverUrl: webhookUrl,
        serverUrlSecret: Deno.env.get("VAPI_WEBHOOK_SECRET"),
        metadata: {
          benefitpath_tenant_id: auth.tenantId,
          benefitpath_agent_id: agentId,
          environment: "production",
        },
        endCallPhrases: [
          "stop calling me",
          "do not call",
          "remove my number",
          "take me off your list",
          "don't call again",
        ],
      };

      // Update transfer tool
      if (updatedConfig.transfer_phone_number) {
        vapiUpdate.tools = [
          {
            type: "transferCall",
            messages: [
              {
                type: "request-start",
                content:
                  updatedConfig.transfer_announcement ||
                  "Let me connect you with one of our specialists. Please hold for just a moment.",
              },
            ],
            destinations: [
              {
                type: "number",
                number: updatedConfig.transfer_phone_number,
                message: updatedConfig.transfer_announcement || "Connecting you now...",
              },
            ],
          },
        ];
      }

      const vapiResult = await vapiRequest({
        method: "PATCH",
        endpoint: `/assistant/${existingAgent.vapi_assistant_id}`,
        body: vapiUpdate,
      });

      if (vapiResult.ok) {
        vapiSynced = true;
        await supabase
          .from("agents")
          .update({
            vapi_sync_status: "synced",
            vapi_last_synced_at: new Date().toISOString(),
            vapi_sync_error: null,
          })
          .eq("id", agentId);
      } else {
        await supabase
          .from("agents")
          .update({
            vapi_sync_status: "error",
            vapi_sync_error: vapiResult.error,
          })
          .eq("id", agentId);

        // Notify about sync error
        const adminClient = createAdminClient();
        await insertNotification(adminClient, auth.tenantId, {
          type: "error",
          title: "Agent sync failed",
          body: `"${updatedConfig.agent_name}" update couldn't sync with the voice engine.`,
          icon: "warning",
          link: "/agents",
        });
      }
    }

    return successResponse({
      agent,
      vapi_synced: vapiSynced,
      message: vapiSynced
        ? "Agent updated and synced"
        : existingAgent.vapi_assistant_id
        ? "Agent updated but voice sync failed"
        : "Agent updated (no voice engine link yet)",
    });
  } catch (err) {
    console.error("update-agent error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

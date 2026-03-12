import { getAuthContext, corsHeaders, errorResponse, successResponse } from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { compileSystemPrompt } from "../_shared/prompt-compiler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const auth = await getAuthContext(req).catch(() => null);
    if (!auth) return errorResponse("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const body = await req.json();
    const { agent_id, updates } = body;

    if (!agent_id) return errorResponse("agent_id is required", 400);

    // Fetch existing agent (RLS ensures tenant isolation)
    const { data: agent, error: fetchErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (fetchErr || !agent) return errorResponse("Agent not found", 404);

    // Update in DB
    const { data: updatedAgent, error: updateErr } = await supabase
      .from("agents")
      .update({ ...updates, vapi_sync_status: "outdated" })
      .eq("id", agent_id)
      .select()
      .single();

    if (updateErr) return errorResponse(updateErr.message, 400);

    // If agent has a VAPI assistant, recompile prompt and sync
    if (agent.vapi_assistant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", agent.tenant_id)
        .single();

      if (tenant) {
        const merged = { ...agent, ...updates };
        const promptInput = {
          ...merged,
          transfer_enabled: !!merged.transfer_phone_number,
          consent_script_override: merged.consent_script,
          recording_enabled_override: merged.record_calls,
          recording_disclosure_override: merged.disclosure_script,
        };

        const compiledPrompt = compileSystemPrompt(promptInput, {
          company_name: tenant.company_name,
          industry: tenant.industry,
          recording_disclosure_enabled: tenant.recording_disclosure_enabled,
          recording_disclosure_text: tenant.recording_disclosure_text,
          require_consent: tenant.require_consent,
          consent_script: tenant.consent_script,
        });

        const adminClient = createAdminClient();
        await adminClient.from("agents").update({ compiled_system_prompt: compiledPrompt }).eq("id", agent_id);

        const vapiUpdate: Record<string, unknown> = {
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [{ role: "system", content: compiledPrompt }],
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

        if (merged.transfer_phone_number) {
          vapiUpdate.tools = [{
            type: "transferCall",
            destinations: [{
              type: "number",
              number: merged.transfer_phone_number,
              message: merged.transfer_announcement,
            }],
          }];
        }

        const vapiRes = await vapiRequest({
          method: "PATCH",
          endpoint: `/assistant/${agent.vapi_assistant_id}`,
          body: vapiUpdate,
        });

        if (vapiRes.ok) {
          await adminClient.from("agents").update({
            vapi_sync_status: "synced",
            vapi_last_synced_at: new Date().toISOString(),
            vapi_sync_error: null,
          }).eq("id", agent_id);
        } else {
          await adminClient.from("agents").update({
            vapi_sync_status: "error",
            vapi_sync_error: vapiRes.error,
          }).eq("id", agent_id);
        }
      }
    }

    return successResponse(updatedAgent);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
});

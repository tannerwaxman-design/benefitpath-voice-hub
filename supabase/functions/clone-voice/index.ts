// ============================================================
// EDGE FUNCTION: clone-voice
//
// Accepts an audio recording, uploads it to ElevenLabs for
// instant voice cloning, and returns the cloned voice_id.
// Optimized for high-quality clone output.
// ============================================================

import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return errorResponse("ElevenLabs API key not configured", 500);
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const agentId = formData.get("agent_id") as string | null;
    const voiceName = formData.get("voice_name") as string || "My Cloned Voice";

    if (!audioFile) {
      return errorResponse("Audio file is required");
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return errorResponse("Audio file too large (max 10MB)");
    }

    console.log(`[CLONE-VOICE] Starting clone for tenant=${auth.tenantId}, file size=${audioFile.size}, type=${audioFile.type}`);

    // Upload to ElevenLabs voice cloning API with optimized labels
    const elFormData = new FormData();
    elFormData.append("name", `${voiceName} - ${auth.tenantId.substring(0, 8)}`);
    elFormData.append(
      "description",
      "Professional insurance agent voice clone created via BenefitPath"
    );
    elFormData.append("files", audioFile);
    // Labels help ElevenLabs optimize the voice model
    elFormData.append(
      "labels",
      JSON.stringify({
        accent: "american",
        use_case: "conversational",
      })
    );

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: elFormData,
    });

    if (!elResponse.ok) {
      const errBody = await elResponse.text();
      console.error("[CLONE-VOICE] ElevenLabs failed:", elResponse.status, errBody);

      if (agentId) {
        const adminClient = createAdminClient();
        await adminClient
          .from("agents")
          .update({ voice_clone_status: "error" })
          .eq("id", agentId)
          .eq("tenant_id", auth.tenantId);
      }

      return errorResponse(`Voice cloning failed: ${errBody}`, 500);
    }

    const result = await elResponse.json();
    const clonedVoiceId = result.voice_id;
    console.log(`[CLONE-VOICE] Success, voice_id=${clonedVoiceId}`);

    // If agent_id provided, update the agent record
    if (agentId) {
      const adminClient = createAdminClient();
      await adminClient
        .from("agents")
        .update({
          cloned_voice_id: clonedVoiceId,
          voice_source: "cloned",
          voice_clone_status: "ready",
          voice_id: clonedVoiceId,
          voice_name: voiceName,
        })
        .eq("id", agentId)
        .eq("tenant_id", auth.tenantId);
    }

    return successResponse({
      voice_id: clonedVoiceId,
      message: "Voice clone created successfully",
    });
  } catch (err) {
    console.error("[CLONE-VOICE] Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

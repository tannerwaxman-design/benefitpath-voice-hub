// ============================================================
// EDGE FUNCTION: sync-elevenlabs-credential
// Registers the ElevenLabs API key as a credential in VAPI
// so that VAPI can use ElevenLabs voices for calls.
// ============================================================

import { vapiRequest } from "../_shared/vapi-client.ts";
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
    await getAuthContext(req);

    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsKey) {
      return errorResponse("ELEVENLABS_API_KEY is not configured", 500);
    }

    // First, check if credential already exists
    const listResult = await vapiRequest<Array<{ id: string; provider: string }>>({
      method: "GET",
      endpoint: "/credential",
    });

    if (listResult.ok && listResult.data) {
      const existing = (listResult.data as unknown as Array<{ id: string; provider: string }>)
        .find((c) => c.provider === "11labs");
      if (existing) {
        // Update existing credential
        const updateResult = await vapiRequest({
          method: "PATCH",
          endpoint: `/credential/${existing.id}`,
          body: {
            provider: "11labs",
            apiKey: elevenLabsKey,
          },
        });

        if (updateResult.ok) {
          return successResponse({
            message: "ElevenLabs credential updated in voice engine",
            credential_id: existing.id,
          });
        }
        return errorResponse("Failed to update credential: " + updateResult.error, 502);
      }
    }

    // Create new credential
    const createResult = await vapiRequest<{ id: string }>({
      method: "POST",
      endpoint: "/credential",
      body: {
        provider: "11labs",
        apiKey: elevenLabsKey,
      },
    });

    if (!createResult.ok) {
      return errorResponse("Failed to create credential: " + createResult.error, 502);
    }

    return successResponse({
      message: "ElevenLabs credential registered with voice engine",
      credential_id: createResult.data?.id,
    }, 201);
  } catch (err) {
    console.error("sync-elevenlabs-credential error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

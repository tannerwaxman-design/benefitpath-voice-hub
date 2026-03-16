import { vapiRequest } from "../_shared/vapi-client.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

interface VapiPhoneNumberConfig {
  assistantId?: string | null;
  server?: {
    url?: string | null;
    credentialId?: string | null;
  } | null;
  serverUrl?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);

    if (auth.role !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    const serviceClient = createAdminClient();

    const body = await req.json();
    const phoneId = body.phone_id;
    const agentId = body.agent_id ?? null;

    if (!phoneId) {
      return errorResponse("phone_id is required");
    }

    const { data: phoneNumber, error: phoneError } = await serviceClient
      .from("phone_numbers")
      .select("id, phone_number, vapi_phone_id, assigned_agent_id, tenant_id")
      .eq("id", phoneId)
      .single();

    if (phoneError || !phoneNumber || phoneNumber.tenant_id !== auth.tenantId) {
      return errorResponse("Phone number not found", 404);
    }

    let assistantId: string | null = null;

    if (agentId) {
      const { data: agent, error: agentError } = await serviceClient
        .from("agents")
        .select("id, agent_name, vapi_assistant_id, tenant_id")
        .eq("id", agentId)
        .single();

      if (agentError || !agent || agent.tenant_id !== auth.tenantId) {
        return errorResponse("Agent not found", 404);
      }

      if (!agent.vapi_assistant_id) {
        return errorResponse("Agent is not synced with voice engine", 400);
      }

      assistantId = agent.vapi_assistant_id;
    }

    if (!phoneNumber.vapi_phone_id) {
      return errorResponse("Phone number is not synced with voice engine", 400);
    }

    const currentPhoneConfig = await vapiRequest<VapiPhoneNumberConfig>({
      method: "GET",
      endpoint: `/phone-number/${phoneNumber.vapi_phone_id}`,
    });

    const patchBody: Record<string, unknown> = { assistantId };
    const currentServerUrl = currentPhoneConfig.data?.server?.url;
    const currentServerUrlAlias = currentPhoneConfig.data?.serverUrl;

    if (currentServerUrl) {
      patchBody.server = {
        ...currentPhoneConfig.data?.server,
        url: "",
      };
    }

    if (currentServerUrlAlias) {
      patchBody.serverUrl = "";
    }

    console.log("assign-phone-number sync", {
      phoneId,
      vapiPhoneId: phoneNumber.vapi_phone_id,
      assistantId,
      currentServerUrl,
      currentServerUrlAlias,
      clearingPhoneLevelServerRouting: Boolean(currentServerUrl || currentServerUrlAlias),
    });

    let vapiResult = await vapiRequest({
      method: "PATCH",
      endpoint: `/phone-number/${phoneNumber.vapi_phone_id}`,
      body: patchBody,
    });

    if (!vapiResult.ok && (currentServerUrl || currentServerUrlAlias)) {
      console.warn("assign-phone-number retrying without server clear", vapiResult.error);
      vapiResult = await vapiRequest({
        method: "PATCH",
        endpoint: `/phone-number/${phoneNumber.vapi_phone_id}`,
        body: { assistantId },
      });
    }

    if (!vapiResult.ok) {
      return errorResponse(
        "Failed to sync phone number assignment with voice engine: " +
          (vapiResult.error || "Unknown error"),
        502
      );
    }

    const { data: updatedPhone, error: updateError } = await serviceClient
      .from("phone_numbers")
      .update({ assigned_agent_id: agentId })
      .eq("id", phoneId)
      .select("*, agents(id, agent_name)")
      .single();

    if (updateError || !updatedPhone) {
      return errorResponse("Failed to update phone number assignment", 500);
    }

    return successResponse(updatedPhone);
  } catch (err) {
    console.error("assign-phone-number error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});
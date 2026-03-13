// ============================================================
// EDGE FUNCTION: provision-phone-number
// Provisions a new phone number via VAPI/Twilio
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const auth = await getAuthContext(req);

    if (auth.role !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    const body = await req.json();
    const { number_type, area_code, friendly_name } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Request number from VAPI (free Vapi numbers)
    const vapiPayload: Record<string, unknown> = {
      provider: "vapi",
      ...(area_code && { numberDesiredAreaCode: area_code }),
    };

    const vapiResult = await vapiRequest<{
      id: string;
      number?: string;
      phoneNumber?: string;
    }>({
      method: "POST",
      endpoint: "/phone-number",
      body: vapiPayload,
    });

    if (!vapiResult.ok || !vapiResult.data) {
      return errorResponse(
        "Failed to provision number: " + (vapiResult.error || "Unknown error"),
        502
      );
    }

    const vapiNumber = vapiResult.data;

    // Save to our DB
    const { data: phoneRecord, error: insertErr } = await supabase
      .from("phone_numbers")
      .insert({
        tenant_id: auth.tenantId,
        vapi_phone_id: vapiNumber.id,
        phone_number: vapiNumber.number || vapiNumber.phoneNumber || "",
        friendly_name: friendly_name || null,
        area_code: area_code || null,
        number_type: number_type || "local",
        status: "active",
        monthly_cost: number_type === "toll_free" ? 3.0 : 1.5,
      })
      .select()
      .single();

    if (insertErr) {
      return errorResponse(
        "Failed to save phone number: " + insertErr.message,
        500
      );
    }

    return successResponse(phoneRecord, 201);
  } catch (err) {
    console.error("provision-phone-number error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

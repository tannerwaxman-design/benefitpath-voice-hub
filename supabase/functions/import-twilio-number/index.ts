// ============================================================
// EDGE FUNCTION: import-twilio-number
// Imports an existing Twilio number and registers it with VAPI
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const body = await req.json();
    const { phone_number, twilio_account_sid, twilio_auth_token, friendly_name } = body;

    if (!phone_number || !twilio_account_sid || !twilio_auth_token) {
      return errorResponse("phone_number, twilio_account_sid, and twilio_auth_token are required");
    }

    // Save Twilio credentials on tenant if not already saved
    await supabase
      .from("tenants")
      .update({
        twilio_account_sid,
        twilio_auth_token,
      })
      .eq("id", auth.tenantId);

    // Register this number with VAPI as a Twilio number
    const vapiResult = await vapiRequest<{
      id: string;
      number?: string;
      phoneNumber?: string;
    }>({
      method: "POST",
      endpoint: "/phone-number",
      body: {
        provider: "twilio",
        number: phone_number,
        twilioAccountSid: twilio_account_sid,
        twilioAuthToken: twilio_auth_token,
      },
    });

    if (!vapiResult.ok || !vapiResult.data) {
      return errorResponse(
        "Failed to register number with voice engine: " + (vapiResult.error || "Unknown error"),
        502
      );
    }

    // Save to our DB
    const { data: phoneRecord, error: insertErr } = await supabase
      .from("phone_numbers")
      .insert({
        tenant_id: auth.tenantId,
        vapi_phone_id: vapiResult.data.id,
        phone_number: phone_number,
        friendly_name: friendly_name || null,
        number_type: "local",
        provider: "twilio",
        status: "active",
        monthly_cost: 0, // User pays Twilio directly
      })
      .select()
      .single();

    if (insertErr) {
      return errorResponse("Failed to save phone number: " + insertErr.message, 500);
    }

    return successResponse(phoneRecord, 201);
  } catch (err) {
    console.error("import-twilio-number error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

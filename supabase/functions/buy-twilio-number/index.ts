// ============================================================
// EDGE FUNCTION: buy-twilio-number
// Searches for available Twilio numbers, buys one, and
// registers it with VAPI
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vapiRequest } from "../_shared/vapi-client.ts";
import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

// Twilio API helpers
async function twilioRequest(
  accountSid: string,
  authToken: string,
  method: string,
  path: string,
  body?: URLSearchParams
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`;
  const headers: Record<string, string> = {
    Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
  };
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url, {
    method,
    headers,
    ...(body && { body: body.toString() }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Twilio API error [${response.status}]: ${data.message || JSON.stringify(data)}`
    );
  }
  return data;
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
    const {
      action, // "search" or "buy"
      area_code,
      number_type, // "local" or "toll_free"
      twilio_account_sid,
      twilio_auth_token,
      phone_number, // Only for "buy" action
      friendly_name,
    } = body;

    if (!twilio_account_sid || !twilio_auth_token) {
      return errorResponse("twilio_account_sid and twilio_auth_token are required");
    }

    // Save Twilio credentials on tenant
    await supabase
      .from("tenants")
      .update({
        twilio_account_sid,
        twilio_auth_token,
      })
      .eq("id", auth.tenantId);

    if (action === "search") {
      // Search for available numbers
      const type = number_type === "toll_free" ? "TollFree" : "Local";
      let searchPath = `/AvailablePhoneNumbers/US/${type}.json?`;
      const params = new URLSearchParams();
      if (area_code && type === "Local") {
        params.set("AreaCode", area_code);
      }
      params.set("PageSize", "10");
      searchPath += params.toString();

      const result = await twilioRequest(
        twilio_account_sid,
        twilio_auth_token,
        "GET",
        searchPath
      );

      const numbers = (result.available_phone_numbers || []).map(
        (n: Record<string, unknown>) => ({
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          locality: n.locality,
          region: n.region,
          capabilities: n.capabilities,
        })
      );

      return successResponse({ numbers });
    }

    if (action === "buy") {
      if (!phone_number) {
        return errorResponse("phone_number is required for buying");
      }

      // Purchase the number from Twilio
      const purchaseBody = new URLSearchParams();
      purchaseBody.set("PhoneNumber", phone_number);
      if (friendly_name) {
        purchaseBody.set("FriendlyName", friendly_name);
      }

      const purchased = await twilioRequest(
        twilio_account_sid,
        twilio_auth_token,
        "POST",
        "/IncomingPhoneNumbers.json",
        purchaseBody
      );

      // Register with VAPI
      const vapiResult = await vapiRequest<{
        id: string;
        number?: string;
        phoneNumber?: string;
      }>({
        method: "POST",
        endpoint: "/phone-number",
        body: {
          provider: "twilio",
          number: purchased.phone_number,
          twilioAccountSid: twilio_account_sid,
          twilioAuthToken: twilio_auth_token,
        },
      });

      if (!vapiResult.ok || !vapiResult.data) {
        return errorResponse(
          "Number purchased but failed to register with voice engine: " +
            (vapiResult.error || "Unknown error"),
          502
        );
      }

      // Save to DB
      const { data: phoneRecord, error: insertErr } = await supabase
        .from("phone_numbers")
        .insert({
          tenant_id: auth.tenantId,
          vapi_phone_id: vapiResult.data.id,
          phone_number: purchased.phone_number,
          friendly_name: friendly_name || purchased.friendly_name || null,
          number_type: number_type || "local",
          provider: "twilio",
          status: "active",
          monthly_cost: number_type === "toll_free" ? 2.0 : 1.0,
        })
        .select()
        .single();

      if (insertErr) {
        return errorResponse("Failed to save phone number: " + insertErr.message, 500);
      }

      return successResponse(phoneRecord, 201);
    }

    return errorResponse("Invalid action. Use 'search' or 'buy'.");
  } catch (err) {
    console.error("buy-twilio-number error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

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

    const { twilio_account_sid, twilio_auth_token } = await req.json();

    if (!twilio_account_sid || !twilio_auth_token) {
      return errorResponse("twilio_account_sid and twilio_auth_token are required");
    }

    if (!twilio_account_sid.startsWith("AC") || twilio_account_sid.length < 34) {
      return errorResponse("Invalid Account SID format");
    }

    // Hit Twilio's Account endpoint to verify credentials
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}.json`;
    const resp = await fetch(url, {
      headers: {
        Authorization: "Basic " + btoa(`${twilio_account_sid}:${twilio_auth_token}`),
      },
    });

    if (resp.status === 401) {
      return errorResponse("Invalid Twilio credentials. Please check your Account SID and Auth Token.", 401);
    }

    if (!resp.ok) {
      const body = await resp.text();
      return errorResponse(`Twilio verification failed (${resp.status}): ${body}`, 502);
    }

    const data = await resp.json();

    return successResponse({
      valid: true,
      account_name: data.friendly_name,
      account_status: data.status,
    });
  } catch (err) {
    console.error("verify-twilio-credentials error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

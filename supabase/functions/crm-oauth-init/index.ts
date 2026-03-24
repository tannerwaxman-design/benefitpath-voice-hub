import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";

// OAuth2 configuration per provider
// Actual client IDs/secrets are stored as Supabase secrets
function getOAuthConfig(provider: string, redirectUri: string): {
  authUrl: string;
  clientId: string;
  scope: string;
  extra?: Record<string, string>;
} | null {
  const base = redirectUri;

  switch (provider) {
    case "hubspot":
      return {
        authUrl: "https://app.hubspot.com/oauth/authorize",
        clientId: Deno.env.get("HUBSPOT_CLIENT_ID") ?? "",
        scope: "crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read",
        extra: { response_type: "code" },
      };

    case "salesforce":
      return {
        authUrl: `https://login.salesforce.com/services/oauth2/authorize`,
        clientId: Deno.env.get("SALESFORCE_CLIENT_ID") ?? "",
        scope: "api refresh_token",
        extra: { response_type: "code", prompt: "login consent" },
      };

    case "zoho_crm":
      return {
        authUrl: "https://accounts.zoho.com/oauth/v2/auth",
        clientId: Deno.env.get("ZOHO_CLIENT_ID") ?? "",
        scope: "ZohoCRM.modules.contacts.READ ZohoCRM.modules.contacts.WRITE ZohoCRM.modules.leads.READ",
        extra: { response_type: "code", access_type: "offline" },
      };

    case "google_calendar":
      return {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
        extra: { response_type: "code", access_type: "offline", prompt: "consent" },
      };

    case "outlook_calendar":
      return {
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        clientId: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
        scope: "Calendars.ReadWrite offline_access",
        extra: { response_type: "code" },
      };

    case "calendly":
      return {
        authUrl: "https://auth.calendly.com/oauth/authorize",
        clientId: Deno.env.get("CALENDLY_CLIENT_ID") ?? "",
        scope: "",
        extra: { response_type: "code" },
      };

    default:
      return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    await getAuthContext(req);

    const { provider } = await req.json();
    if (!provider) {
      return errorResponse("provider is required");
    }

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:8080";
    const redirectUri = `${appUrl}/oauth/callback`;

    const config = getOAuthConfig(provider, redirectUri);
    if (!config) {
      return errorResponse(`Unsupported provider: ${provider}`);
    }

    if (!config.clientId) {
      return errorResponse(
        `OAuth client not configured for ${provider}. Please contact support.`,
        503
      );
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scope,
      state: `provider=${provider}`,
      ...config.extra,
    });

    const authorizationUrl = `${config.authUrl}?${params.toString()}`;
    return successResponse({ authorization_url: authorizationUrl, provider });
  } catch (err) {
    console.error("crm-oauth-init error:", err);
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return errorResponse(err.message, 401);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

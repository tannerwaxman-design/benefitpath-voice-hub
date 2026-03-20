import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function exchangeCode(
  provider: string,
  code: string,
  redirectUri: string
): Promise<TokenResponse & { account_name?: string; account_email?: string }> {
  const tokenUrls: Record<string, string> = {
    hubspot: "https://api.hubapi.com/oauth/v1/token",
    salesforce: "https://login.salesforce.com/services/oauth2/token",
    zoho_crm: "https://accounts.zoho.com/oauth/v2/token",
    google_calendar: "https://oauth2.googleapis.com/token",
    outlook_calendar: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    calendly: "https://auth.calendly.com/oauth/token",
  };

  const clientIds: Record<string, string> = {
    hubspot: Deno.env.get("HUBSPOT_CLIENT_ID") ?? "",
    salesforce: Deno.env.get("SALESFORCE_CLIENT_ID") ?? "",
    zoho_crm: Deno.env.get("ZOHO_CLIENT_ID") ?? "",
    google_calendar: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
    outlook_calendar: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
    calendly: Deno.env.get("CALENDLY_CLIENT_ID") ?? "",
  };

  const clientSecrets: Record<string, string> = {
    hubspot: Deno.env.get("HUBSPOT_CLIENT_SECRET") ?? "",
    salesforce: Deno.env.get("SALESFORCE_CLIENT_SECRET") ?? "",
    zoho_crm: Deno.env.get("ZOHO_CLIENT_SECRET") ?? "",
    google_calendar: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
    outlook_calendar: Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "",
    calendly: Deno.env.get("CALENDLY_CLIENT_SECRET") ?? "",
  };

  const tokenUrl = tokenUrls[provider];
  if (!tokenUrl) throw new Error(`Unknown provider: ${provider}`);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientIds[provider],
    client_secret: clientSecrets[provider],
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${errText}`);
  }

  const tokens = await resp.json() as TokenResponse;

  // Try to fetch account info for display
  let account_name: string | undefined;
  let account_email: string | undefined;

  try {
    if (provider === "hubspot") {
      const info = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
      if (info.ok) {
        const d = await info.json();
        account_email = d.user;
        account_name = d.hub_domain;
      }
    } else if (provider === "google_calendar") {
      const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (info.ok) {
        const d = await info.json();
        account_email = d.email;
        account_name = d.name;
      }
    } else if (provider === "outlook_calendar") {
      const info = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (info.ok) {
        const d = await info.json();
        account_email = d.mail ?? d.userPrincipalName;
        account_name = d.displayName;
      }
    } else if (provider === "calendly") {
      const info = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (info.ok) {
        const d = await info.json();
        account_email = d.resource?.email;
        account_name = d.resource?.name;
      }
    }
  } catch { /* account info is optional */ }

  return { ...tokens, account_name, account_email };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);
    const supabase = createAdminClient();

    const { provider, code } = await req.json();
    if (!provider || !code) {
      return errorResponse("provider and code are required");
    }

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:8080";
    const redirectUri = `${appUrl}/oauth/callback`;

    const tokens = await exchangeCode(provider, code, redirectUri);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from("crm_connections")
      .upsert({
        tenant_id: auth.tenantId,
        provider,
        status: "connected",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        account_name: tokens.account_name ?? null,
        account_email: tokens.account_email ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,provider" });

    if (error) {
      return errorResponse("Failed to save connection: " + error.message);
    }

    return successResponse({
      provider,
      status: "connected",
      account_name: tokens.account_name,
      account_email: tokens.account_email,
    });
  } catch (err) {
    console.error("crm-oauth-callback error:", err);
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return errorResponse(err.message, 401);
    }
    return errorResponse(
      err instanceof Error ? err.message : "OAuth callback failed",
      500
    );
  }
});

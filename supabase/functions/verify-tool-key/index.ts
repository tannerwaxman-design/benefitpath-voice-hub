import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { service, api_key, additional_config, reverify, key_id } = body;

    // If reverify, fetch stored key from DB
    let keyToTest = api_key;
    let config = additional_config || {};

    if (reverify && key_id) {
      const { createClient: createAdminClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createAdminClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: keyRecord } = await adminClient
        .from("tool_api_keys")
        .select("*")
        .eq("id", key_id)
        .single();

      if (!keyRecord) {
        return json({ valid: false, error: "API key record not found" });
      }
      keyToTest = await decryptKey(keyRecord.api_key);
      config = keyRecord.additional_config || {};
    }

    let result: { valid: boolean; error?: string; account_name?: string };

    switch (service) {
      case "ghl":
        result = await verifyGHL(keyToTest, config);
        break;
      case "hubspot":
        result = await verifyHubSpot(keyToTest);
        break;
      case "salesforce":
        result = await verifySalesforce(keyToTest, config);
        break;
      case "google_calendar":
        result = await verifyGoogleCalendar(keyToTest);
        break;
      case "zapier":
      case "custom":
        result = await verifyWebhook(keyToTest);
        break;
      default:
        result = { valid: false, error: `Unknown service: ${service}` };
    }

    // If valid and not reverify, encrypt and store the key
    if (result.valid && !reverify && keyToTest) {
      const { createClient: createAdminClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createAdminClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Get tenant_id
      const { data: tenantUser } = await adminClient
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!tenantUser) {
        return json({ valid: false, error: "No tenant found" });
      }

      const encryptedKey = await encryptKey(keyToTest);

      await adminClient
        .from("tool_api_keys")
        .upsert(
          {
            tenant_id: tenantUser.tenant_id,
            service,
            api_key: encryptedKey,
            additional_config: config,
            display_name: result.account_name || body.display_name || service,
            status: "active",
            connected_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,service" }
        );
    }

    // If reverify and valid, update last_verified_at
    if (reverify && result.valid && key_id) {
      const { createClient: createAdminClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createAdminClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient
        .from("tool_api_keys")
        .update({ last_verified_at: new Date().toISOString(), status: "active" })
        .eq("id", key_id);
    }

    // If reverify and invalid, mark as invalid
    if (reverify && !result.valid && key_id) {
      const { createClient: createAdminClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createAdminClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient
        .from("tool_api_keys")
        .update({ status: "invalid" })
        .eq("id", key_id);
    }

    return json(result);
  } catch (err) {
    console.error("verify-tool-key error:", err);
    return json({ valid: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ==========================================
// SERVICE VALIDATORS
// ==========================================

async function verifyGHL(apiKey: string, config: Record<string, unknown>): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  const locationId = config?.location_id as string;
  if (!locationId) {
    return { valid: false, error: "Location ID is required for GoHighLevel. Find it in Settings → Business Info." };
  }

  try {
    const resp = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-04-15",
        },
      }
    );

    if (resp.status === 200) {
      return { valid: true, account_name: `GHL (${locationId.slice(0, 8)}...)` };
    }
    if (resp.status === 401) {
      return { valid: false, error: "Invalid API key. Double check your key in GHL Settings → API Keys." };
    }
    if (resp.status === 403) {
      return { valid: false, error: "This API key doesn't have the required permissions. Make sure it has read/write access to contacts and calendars." };
    }
    const body = await resp.text();
    return { valid: false, error: `GHL returned ${resp.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Could not reach GHL API: ${(e as Error).message}` };
  }
}

async function verifyHubSpot(apiKey: string): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  try {
    const resp = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (resp.status === 200) {
      return { valid: true, account_name: "HubSpot" };
    }
    if (resp.status === 401) {
      return { valid: false, error: "Invalid HubSpot API key. Check your private app access token." };
    }
    const body = await resp.text();
    return { valid: false, error: `HubSpot returned ${resp.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Could not reach HubSpot API: ${(e as Error).message}` };
  }
}

async function verifySalesforce(apiKey: string, config: Record<string, unknown>): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  const instanceUrl = (config?.instance_url as string) || "https://login.salesforce.com";
  try {
    const resp = await fetch(
      `${instanceUrl}/services/data/v58.0/`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (resp.status === 200) {
      return { valid: true, account_name: "Salesforce" };
    }
    if (resp.status === 401) {
      return { valid: false, error: "Invalid Salesforce access token." };
    }
    const body = await resp.text();
    return { valid: false, error: `Salesforce returned ${resp.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Could not reach Salesforce API: ${(e as Error).message}` };
  }
}

async function verifyGoogleCalendar(apiKey: string): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  try {
    const resp = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (resp.status === 200) {
      return { valid: true, account_name: "Google Calendar" };
    }
    if (resp.status === 401) {
      return { valid: false, error: "Invalid Google Calendar token. It may have expired." };
    }
    const body = await resp.text();
    return { valid: false, error: `Google Calendar returned ${resp.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Could not reach Google Calendar API: ${(e as Error).message}` };
  }
}

async function verifyWebhook(url: string): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  if (!url || !url.startsWith("http")) {
    return { valid: false, error: "Please provide a valid webhook URL starting with https://" };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test: true,
        source: "benefitpath_voice_ai",
        message: "This is a test from BenefitPath Voice AI. If you see this, your webhook is connected.",
      }),
    });

    if (resp.ok) {
      return { valid: true, account_name: "Webhook" };
    }
    return { valid: false, error: `Webhook returned ${resp.status}. Make sure the URL is correct and the receiving service is running.` };
  } catch (e) {
    return { valid: false, error: `Could not reach webhook URL: ${(e as Error).message}` };
  }
}

// ==========================================
// ENCRYPTION HELPERS
// ==========================================

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
  if (!secret) {
    throw new Error("API_KEY_ENCRYPTION_SECRET is not configured");
  }
  const keyBytes = hexToBytes(secret.slice(0, 64));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptKey(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return bytesToHex(iv) + ":" + bytesToHex(new Uint8Array(encrypted));
}

async function decryptKey(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const [ivHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !dataHex) {
    // Fallback: key might be stored unencrypted (legacy)
    return ciphertext;
  }
  const iv = hexToBytes(ivHex);
  const data = hexToBytes(dataHex);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ==========================================
// HELPERS
// ==========================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

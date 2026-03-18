import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { service, api_key, additional_config, reverify, tenant_id } = body;

    const adminClient = createAdminClient();

    // If reverify mode, load the stored key
    let keyToTest = api_key;
    let storedConfig = additional_config || {};

    if (reverify && tenant_id) {
      const { data: stored } = await adminClient
        .from("tool_api_keys")
        .select("api_key, additional_config")
        .eq("tenant_id", tenant_id)
        .eq("service", service)
        .single();

      if (!stored) {
        return new Response(JSON.stringify({ valid: false, error: "No stored key found for this service." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      keyToTest = stored.api_key;
      storedConfig = stored.additional_config || {};
    }

    // Validate the key against the service
    let result: { valid: boolean; error?: string; account_name?: string; calendars?: any[] };

    switch (service) {
      case "ghl":
        result = await validateGHL(keyToTest, storedConfig.location_id || additional_config?.location_id);
        break;
      case "hubspot":
        result = await validateHubSpot(keyToTest);
        break;
      case "salesforce":
        result = await validateSalesforce(keyToTest, storedConfig.instance_url || additional_config?.instance_url);
        break;
      case "google_calendar":
        result = await validateGoogleCalendar(keyToTest);
        break;
      case "zapier":
      case "custom":
      case "custom_webhook":
        result = await validateWebhook(keyToTest);
        break;
      default:
        result = { valid: true };
    }

    // If reverify, update the stored key status
    if (reverify && tenant_id) {
      await adminClient
        .from("tool_api_keys")
        .update({
          status: result.valid ? "active" : "invalid",
          last_verified_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id)
        .eq("service", service);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-api-key error:", err);
    return new Response(JSON.stringify({ valid: false, error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function validateGHL(apiKey: string, locationId?: string): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  if (!locationId) {
    return { valid: false, error: "Location ID is required for GoHighLevel. Find it in Settings → Business Info in your GHL sub-account." };
  }

  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-04-15",
        },
      }
    );

    if (res.status === 200) {
      return { valid: true, account_name: `GHL Location ${locationId.substring(0, 8)}...` };
    }
    if (res.status === 401) {
      return { valid: false, error: "Invalid API key. Double check your key in GHL Settings → API Keys." };
    }
    if (res.status === 403) {
      return { valid: false, error: "This API key doesn't have the required permissions. Make sure it has read/write access to contacts and calendars." };
    }
    return { valid: false, error: `GoHighLevel returned status ${res.status}. Please check your API key and Location ID.` };
  } catch (e) {
    return { valid: false, error: `Could not reach GoHighLevel API: ${(e as Error).message}` };
  }
}

async function validateHubSpot(apiKey: string): Promise<{ valid: boolean; error?: string; account_name?: string }> {
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 200) {
      return { valid: true, account_name: "HubSpot Account" };
    }
    if (res.status === 401) {
      return { valid: false, error: "Invalid API key. Generate a new private app token in HubSpot → Settings → Integrations → Private Apps." };
    }
    return { valid: false, error: `HubSpot returned status ${res.status}.` };
  } catch (e) {
    return { valid: false, error: `Could not reach HubSpot API: ${(e as Error).message}` };
  }
}

async function validateSalesforce(apiKey: string, instanceUrl?: string): Promise<{ valid: boolean; error?: string }> {
  const url = instanceUrl || "https://login.salesforce.com";
  try {
    const res = await fetch(`${url}/services/data/v58.0/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 200) return { valid: true };
    if (res.status === 401) return { valid: false, error: "Invalid or expired Salesforce access token." };
    return { valid: false, error: `Salesforce returned status ${res.status}.` };
  } catch (e) {
    return { valid: false, error: `Could not reach Salesforce: ${(e as Error).message}` };
  }
}

async function validateGoogleCalendar(apiKey: string): Promise<{ valid: boolean; error?: string; calendars?: any[] }> {
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 200) {
      const data = await res.json();
      const calendars = (data.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary || false,
      }));
      return { valid: true, calendars };
    }
    if (res.status === 401) {
      return { valid: false, error: "Invalid or expired Google Calendar token." };
    }
    return { valid: false, error: `Google Calendar returned status ${res.status}.` };
  } catch (e) {
    return { valid: false, error: `Could not reach Google Calendar API: ${(e as Error).message}` };
  }
}

async function validateWebhook(url: string): Promise<{ valid: boolean; error?: string }> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return { valid: false, error: "Please enter a valid webhook URL starting with https://" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test: true,
        source: "benefitpath_voice_ai",
        message: "This is a test from BenefitPath Voice AI. If you see this, your webhook is connected.",
        timestamp: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      return { valid: true };
    }
    return { valid: false, error: `The webhook URL returned status ${res.status}. Make sure the URL is correct and the receiving service is running.` };
  } catch (e) {
    return { valid: false, error: `Could not reach webhook URL: ${(e as Error).message}. Make sure the URL is correct.` };
  }
}

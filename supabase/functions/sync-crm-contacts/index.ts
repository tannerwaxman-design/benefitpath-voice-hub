// ============================================================
// EDGE FUNCTION: sync-crm-contacts
//
// Imports contacts from HubSpot, GHL, or Salesforce into
// the BenefitPath contacts table.
//
// Actions:
//   import — pull contacts from the connected CRM and upsert
//            them into the contacts table (match by phone)
// ============================================================

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
    // Authenticate via user JWT
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant_id from users table
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;
    const body = await req.json();
    const { action, provider } = body;

    if (action !== "import") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the active CRM API key for this tenant
    const crmServices = provider ? [provider] : ["hubspot", "ghl", "salesforce"];
    let apiKeyRecord: any = null;

    for (const service of crmServices) {
      const { data } = await adminClient
        .from("tool_api_keys")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("service", service)
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        apiKeyRecord = data;
        break;
      }
    }

    if (!apiKeyRecord) {
      return new Response(JSON.stringify({ error: "No active CRM integration found. Connect a CRM in Settings > API." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = apiKeyRecord.service as string;
    const apiKey = apiKeyRecord.api_key as string;
    const additionalConfig = (apiKeyRecord.additional_config || {}) as Record<string, any>;

    console.log(`[sync-crm-contacts] Starting import from ${service} for tenant ${tenantId}`);

    // Fetch contacts from CRM
    let crmContacts: CrmContact[] = [];
    try {
      switch (service) {
        case "hubspot":
          crmContacts = await fetchHubSpotContacts(apiKey);
          break;
        case "ghl":
          crmContacts = await fetchGHLContacts(apiKey, additionalConfig.location_id as string);
          break;
        case "salesforce":
          crmContacts = await fetchSalesforceContacts(apiKey, additionalConfig.instance_url as string || "https://login.salesforce.com");
          break;
        default:
          return new Response(JSON.stringify({ error: `Unsupported CRM service: ${service}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
    } catch (err) {
      console.error(`[sync-crm-contacts] CRM fetch error:`, err);
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: `Failed to fetch contacts from ${service}: ${msg}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[sync-crm-contacts] Fetched ${crmContacts.length} contacts from ${service}`);

    // Upsert contacts into BenefitPath contacts table
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of crmContacts) {
      if (!contact.phone && !contact.email) {
        skipped++;
        continue;
      }

      try {
        // Try to match existing contact by phone first, then email
        let existingContact: any = null;

        if (contact.phone) {
          const normalizedPhone = normalizePhone(contact.phone);
          const { data } = await adminClient
            .from("contacts")
            .select("id, custom_fields")
            .eq("tenant_id", tenantId)
            .eq("phone", normalizedPhone)
            .maybeSingle();
          existingContact = data;
        }

        if (!existingContact && contact.email) {
          const { data } = await adminClient
            .from("contacts")
            .select("id, custom_fields")
            .eq("tenant_id", tenantId)
            .eq("email", contact.email.toLowerCase())
            .maybeSingle();
          existingContact = data;
        }

        const customFields = {
          ...(existingContact?.custom_fields || {}),
          crm_contact_id: contact.crm_id,
          crm_source: service,
        };

        if (existingContact) {
          // Update existing contact with CRM data
          await adminClient
            .from("contacts")
            .update({
              custom_fields: customFields,
              ...(contact.firstName || contact.lastName
                ? { name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") }
                : {}),
            })
            .eq("id", existingContact.id);
          updated++;
        } else {
          // Insert new contact
          const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || "Unknown";
          const phone = contact.phone ? normalizePhone(contact.phone) : null;

          await adminClient.from("contacts").insert({
            tenant_id: tenantId,
            name,
            email: contact.email?.toLowerCase() || null,
            phone,
            status: "active",
            custom_fields: customFields,
          });
          imported++;
        }
      } catch (err) {
        console.error(`[sync-crm-contacts] Failed to upsert contact ${contact.crm_id}:`, err);
        skipped++;
      }
    }

    // Update sync metadata on the api key record
    const updatedConfig = {
      ...additionalConfig,
      last_sync_at: new Date().toISOString(),
      last_sync_count: imported + updated,
    };

    await adminClient
      .from("tool_api_keys")
      .update({ additional_config: updatedConfig })
      .eq("id", apiKeyRecord.id);

    console.log(`[sync-crm-contacts] Done: imported=${imported}, updated=${updated}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ imported, updated, skipped, provider: service }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-crm-contacts] Fatal error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Types ─────────────────────────────────────────────────

interface CrmContact {
  crm_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ─── CRM Fetchers ───────────────────────────────────────────

async function fetchHubSpotContacts(apiKey: string): Promise<CrmContact[]> {
  const contacts: CrmContact[] = [];
  let after: string | undefined;

  // Paginate up to 500 contacts (5 pages of 100)
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
    url.searchParams.set("limit", "100");
    url.searchParams.set("properties", "firstname,lastname,phone,email");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HubSpot API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const results = data.results || [];

    for (const r of results) {
      contacts.push({
        crm_id: r.id,
        firstName: r.properties?.firstname || "",
        lastName: r.properties?.lastname || "",
        email: r.properties?.email || "",
        phone: r.properties?.phone || "",
      });
    }

    after = data.paging?.next?.after;
    if (!after || results.length < 100) break;
  }

  return contacts;
}

async function fetchGHLContacts(apiKey: string, locationId: string): Promise<CrmContact[]> {
  if (!locationId) throw new Error("GHL location_id is required");

  const contacts: CrmContact[] = [];
  let startAfterDate: string | undefined;

  // Paginate up to 500 contacts
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://services.leadconnectorhq.com/contacts/");
    url.searchParams.set("locationId", locationId);
    url.searchParams.set("limit", "100");
    if (startAfterDate) url.searchParams.set("startAfterDate", startAfterDate);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GHL API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const results = data.contacts || [];

    for (const r of results) {
      contacts.push({
        crm_id: r.id,
        firstName: r.firstName || "",
        lastName: r.lastName || "",
        email: r.email || "",
        phone: r.phone || "",
      });
    }

    if (results.length < 100) break;
    // GHL uses the last contact's dateAdded for pagination
    const last = results[results.length - 1];
    startAfterDate = last?.dateAdded;
    if (!startAfterDate) break;
  }

  return contacts;
}

async function fetchSalesforceContacts(apiKey: string, instanceUrl: string): Promise<CrmContact[]> {
  const query = "SELECT+Id,FirstName,LastName,Phone,Email+FROM+Contact+LIMIT+500";
  const url = `${instanceUrl}/services/data/v58.0/query?q=${query}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Salesforce API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.records || []).map((r: any) => ({
    crm_id: r.Id,
    firstName: r.FirstName || "",
    lastName: r.LastName || "",
    email: r.Email || "",
    phone: r.Phone || "",
  }));
}

// ─── Utilities ──────────────────────────────────────────────

function normalizePhone(phone: string): string {
  // Strip non-digits, ensure E.164-ish format
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

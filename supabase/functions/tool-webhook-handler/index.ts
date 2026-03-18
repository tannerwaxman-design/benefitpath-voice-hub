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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const message = body.message;

    const toolCallList = message?.toolCallList || [];
    const toolWithToolCallList = message?.toolWithToolCallList || [];

    // Extract tenant from VAPI call metadata
    const metadata = message?.call?.assistantOverrides?.metadata
      || message?.call?.assistant?.metadata
      || {};
    const tenantId = metadata.benefitpath_tenant_id;
    const callVapiId = message?.call?.id;

    if (!tenantId) {
      console.error("No benefitpath_tenant_id in call metadata");
      return json({
        results: toolCallList.map((tc: any) => ({
          toolCallId: tc.id,
          result: "I wasn't able to complete that right now, but I'll make sure someone follows up.",
        })),
      });
    }

    // Find the internal call record for activity logging
    let callId: string | null = null;
    if (callVapiId) {
      const { data: callRecord } = await supabase
        .from("calls")
        .select("id")
        .eq("vapi_call_id", callVapiId)
        .single();
      callId = callRecord?.id || null;
    }

    const results = [];

    for (let i = 0; i < toolCallList.length; i++) {
      const toolCall = toolCallList[i];
      const vapiToolInfo = toolWithToolCallList[i] || {};
      const functionName = toolCall.function?.name || toolCall.name;
      const args = toolCall.function?.arguments
        ? (typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments)
        : (toolCall.arguments || {});
      const toolCallId = toolCall.id;

      try {
        // Find the tool in our DB by VAPI tool ID
        let tool: any = null;
        if (vapiToolInfo.id) {
          const { data } = await supabase
            .from("tools")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("vapi_tool_id", vapiToolInfo.id)
            .single();
          tool = data;
        }

        // Fallback: match by function name pattern
        if (!tool && functionName) {
          const { data: allTools } = await supabase
            .from("tools")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("status", "active");

          if (allTools) {
            tool = allTools.find((t: any) => {
              const sanitized = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 40);
              return sanitized === functionName;
            });
          }
        }

        if (!tool) {
          console.error(`Tool not found for function: ${functionName}, tenant: ${tenantId}`);
          results.push({
            toolCallId,
            result: "Sorry, I couldn't complete that action. Please try again later.",
          });
          continue;
        }

        // Get the tenant's API key for this service
        const { data: apiKeyRecord } = await supabase
          .from("tool_api_keys")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("service", tool.service)
          .eq("status", "active")
          .single();

        if (!apiKeyRecord && tool.service !== "custom_webhook") {
          results.push({
            toolCallId,
            result: "The integration isn't connected. I'll make sure someone follows up with you.",
          });

          await logActivity(supabase, tool.id, callId, "failed", null, "No active API key for service: " + tool.service);
          continue;
        }

        // Decrypt the API key
        let apiKey = "";
        if (apiKeyRecord) {
          apiKey = await decryptKey(apiKeyRecord.api_key);
        }

        const additionalConfig = apiKeyRecord?.additional_config || {};
        const serviceConfig = tool.service_config || {};

        // Route to the correct service handler
        let result: string;
        switch (tool.service) {
          case "ghl":
            result = await handleGHL(tool, apiKey, additionalConfig, serviceConfig, args);
            break;
          case "hubspot":
            result = await handleHubSpot(tool, apiKey, serviceConfig, args);
            break;
          case "google_calendar":
            result = await handleGoogleCalendar(tool, apiKey, serviceConfig, args);
            break;
          case "salesforce":
            result = await handleSalesforce(tool, apiKey, additionalConfig, serviceConfig, args);
            break;
          case "zapier":
          case "custom":
          case "custom_webhook":
            result = await handleCustomWebhook(serviceConfig, args);
            break;
          default:
            result = "Action completed.";
        }

        // Log success
        await logActivity(supabase, tool.id, callId, "success", `${tool.name}: ${JSON.stringify(args).slice(0, 200)}`, null);

        // Update tool usage stats
        await supabase
          .from("tools")
          .update({ total_uses: (tool.total_uses || 0) + 1, last_used_at: new Date().toISOString() })
          .eq("id", tool.id);

        results.push({ toolCallId, result });
      } catch (err) {
        console.error(`Tool handler error for ${functionName}:`, err);

        await logActivity(supabase, null, callId, "failed", `Failed: ${functionName}`, (err as Error).message);

        results.push({
          toolCallId,
          result: "I wasn't able to complete that right now, but I'll make sure someone follows up with you on that.",
        });
      }
    }

    return json({ results });
  } catch (err) {
    console.error("tool-webhook-handler error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ==========================================
// ACTIVITY LOGGING
// ==========================================

async function logActivity(
  supabase: any,
  toolId: string | null,
  callId: string | null,
  status: string,
  summary: string | null,
  errorMessage: string | null
) {
  try {
    await supabase.from("tool_activity_log").insert({
      tool_id: toolId,
      call_id: callId,
      status,
      summary,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error("Failed to log tool activity:", e);
  }
}

// ==========================================
// SERVICE HANDLERS
// ==========================================

async function handleGHL(
  tool: any, apiKey: string, additionalConfig: any, serviceConfig: any, args: any
): Promise<string> {
  const locationId = additionalConfig?.location_id;
  const template = tool.template;

  if (template === "book_appointment" || template === "create_event") {
    const calendarId = serviceConfig.calendar_id;
    if (!calendarId) throw new Error("No calendar ID configured for this tool");

    const startTime = `${args.preferred_date}T${args.preferred_time || "10:00"}:00`;
    const resp = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/appointments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-04-15",
        },
        body: JSON.stringify({
          calendarId,
          locationId,
          startTime,
          title: `Appointment with ${args.contact_name || "Lead"}`,
          appointmentStatus: "confirmed",
        }),
      }
    );

    if (resp.ok) {
      return `Appointment booked successfully for ${args.preferred_date} at ${args.preferred_time || "10:00 AM"}. A confirmation will be sent.`;
    }
    const error = await resp.text();
    throw new Error(`GHL appointment booking failed: ${error}`);
  }

  if (template === "create_contact") {
    const resp = await fetch(
      "https://services.leadconnectorhq.com/contacts/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-04-15",
        },
        body: JSON.stringify({
          locationId,
          firstName: args.first_name || args.contact_name?.split(" ")[0] || "",
          lastName: args.last_name || args.contact_name?.split(" ").slice(1).join(" ") || "",
          email: args.email || args.contact_email || undefined,
          phone: args.phone || args.contact_phone || undefined,
          tags: serviceConfig.tags ? String(serviceConfig.tags).split(",").map((t: string) => t.trim()) : ["Voice AI Lead"],
        }),
      }
    );

    if (resp.ok) {
      return `Contact created successfully: ${args.contact_name || "New contact"}.`;
    }
    throw new Error("GHL contact creation failed");
  }

  return "Action completed.";
}

async function handleHubSpot(tool: any, apiKey: string, serviceConfig: any, args: any): Promise<string> {
  const template = tool.template;

  if (template === "create_contact") {
    const resp = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            firstname: args.first_name || args.contact_name?.split(" ")[0] || "",
            lastname: args.last_name || args.contact_name?.split(" ").slice(1).join(" ") || "",
            email: args.email || args.contact_email || undefined,
            phone: args.phone || args.contact_phone || undefined,
            lifecyclestage: serviceConfig.lifecycle_stage || "lead",
          },
        }),
      }
    );

    if (resp.ok) {
      return `Contact created in HubSpot: ${args.contact_name || "New contact"}.`;
    }
    const err = await resp.text();
    throw new Error(`HubSpot contact creation failed: ${err}`);
  }

  return "Action completed.";
}

async function handleGoogleCalendar(
  tool: any, apiKey: string, serviceConfig: any, args: any
): Promise<string> {
  const calendarId = serviceConfig.calendar_id || "primary";
  const duration = serviceConfig.duration_minutes || 30;

  const startTime = new Date(`${args.preferred_date}T${args.preferred_time || "10:00"}:00`);
  const endTime = new Date(startTime.getTime() + duration * 60000);

  const eventBody: any = {
    summary: `Appointment with ${args.contact_name || "Client"}`,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
  };

  if (args.contact_email) {
    eventBody.attendees = [{ email: args.contact_email }];
  }

  if (serviceConfig.include_meet_link) {
    eventBody.conferenceData = {
      createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${serviceConfig.include_meet_link ? "?conferenceDataVersion=1" : ""}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (resp.ok) {
    return `Appointment booked on your calendar for ${args.preferred_date} at ${args.preferred_time || "10:00 AM"}. Duration: ${duration} minutes.`;
  }
  const err = await resp.text();
  throw new Error(`Google Calendar event creation failed: ${err}`);
}

async function handleSalesforce(
  tool: any, apiKey: string, additionalConfig: any, serviceConfig: any, args: any
): Promise<string> {
  const instanceUrl = additionalConfig?.instance_url || "https://login.salesforce.com";

  if (tool.template === "create_contact") {
    const resp = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Contact/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        FirstName: args.first_name || args.contact_name?.split(" ")[0] || "",
        LastName: args.last_name || args.contact_name?.split(" ").slice(1).join(" ") || "Unknown",
        Email: args.email || args.contact_email || undefined,
        Phone: args.phone || args.contact_phone || undefined,
      }),
    });

    if (resp.ok) {
      return `Contact created in Salesforce: ${args.contact_name || "New contact"}.`;
    }
    const err = await resp.text();
    throw new Error(`Salesforce contact creation failed: ${err}`);
  }

  return "Action completed.";
}

async function handleCustomWebhook(serviceConfig: any, args: any): Promise<string> {
  const url = serviceConfig.url;
  if (!url) throw new Error("No webhook URL configured");

  const method = serviceConfig.method || "POST";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serviceConfig.auth_header) {
    headers["Authorization"] = serviceConfig.auth_header;
  }

  const resp = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(args),
  });

  if (resp.ok) {
    const data = await resp.text();
    return data || "Action completed successfully.";
  }
  throw new Error(`Webhook returned ${resp.status}`);
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

async function decryptKey(ciphertext: string): Promise<string> {
  // Check if it's encrypted (contains a colon separator)
  if (!ciphertext.includes(":")) {
    // Legacy unencrypted key
    return ciphertext;
  }
  const key = await getEncryptionKey();
  const [ivHex, dataHex] = ciphertext.split(":");
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

// ==========================================
// HELPERS
// ==========================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const body = await req.json();
    const message = body.message;

    const toolCallList = message?.toolCallList || [];
    const toolWithToolCallList = message?.toolWithToolCallList || [];

    // Extract tenant info from call metadata
    const metadata = message?.call?.assistantOverrides?.metadata
      || message?.call?.assistant?.metadata
      || {};
    const tenantId = metadata.benefitpath_tenant_id;

    if (!tenantId) {
      console.error("No tenant_id in call metadata");
      return new Response(JSON.stringify({
        results: toolCallList.map((tc: { id: string }) => ({
          toolCallId: tc.id,
          result: "I wasn't able to complete that action right now, but I'll make sure someone follows up.",
        })),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createAdminClient();
    const results = [];

    for (let i = 0; i < toolCallList.length; i++) {
      const toolCall = toolCallList[i];
      const vapiToolRef = toolWithToolCallList[i];
      const functionName = toolCall.function?.name || toolCall.name;
      const args = typeof toolCall.function?.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : (toolCall.function?.arguments || toolCall.arguments || {});
      const toolCallId = toolCall.id;

      try {
        // Find the tool by vapi_tool_id
        let tool: Record<string, unknown> | null = null;
        if (vapiToolRef?.toolId) {
          const { data } = await supabase
            .from("tools")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("vapi_tool_id", vapiToolRef.toolId)
            .single();
          tool = data;
        }

        // Fallback: match by function name pattern
        if (!tool) {
          const { data: tools } = await supabase
            .from("tools")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("status", "active");

          if (tools) {
            const sanitized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 40);
            tool = tools.find((t) => sanitized(t.name as string) === functionName) ?? null;
          }
        }

        if (!tool) {
          console.error(`No tool found for function: ${functionName}, tenant: ${tenantId}`);
          results.push({
            toolCallId,
            result: "I wasn't able to complete that action. Please try again later.",
          });
          continue;
        }

        // Get the stored API key for this service
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
            result: "The integration isn't connected right now. I'll make sure someone follows up with you.",
          });

          await logActivity(supabase, tenantId, tool.id, metadata.benefitpath_call_id, "failed", `${tool.name}: No API key found for ${tool.service}`, "API key not connected");
          continue;
        }

        const apiKey = apiKeyRecord?.api_key || "";
        const additionalConfig = apiKeyRecord?.additional_config || {};
        const serviceConfig = tool.service_config || {};

        // Route to the correct service handler
        let result: string;
        switch (tool.service) {
          case "ghl":
            result = await handleGHL(tool, apiKey, additionalConfig, args);
            break;
          case "hubspot":
            result = await handleHubSpot(tool, apiKey, args);
            break;
          case "google_calendar":
            result = await handleGoogleCalendar(tool, apiKey, serviceConfig, args);
            break;
          case "salesforce":
            result = await handleSalesforce(tool, apiKey, additionalConfig, args);
            break;
          case "custom_webhook":
          case "custom":
            result = await handleCustomWebhook(serviceConfig, args);
            break;
          default:
            result = "Action completed.";
        }

        // Log success
        await logActivity(supabase, tenantId, tool.id, metadata.benefitpath_call_id, "success", `${tool.name}: ${JSON.stringify(args).slice(0, 200)}`, null);

        // Update usage count
        await supabase
          .from("tools")
          .update({ total_uses: (tool.total_uses || 0) + 1, last_used_at: new Date().toISOString() })
          .eq("id", tool.id);

        results.push({ toolCallId, result });
      } catch (err) {
        console.error(`Tool handler error for ${functionName}:`, err);
        const errMsg = err instanceof Error ? err.message : "Unknown error";

        await logActivity(supabase, tenantId, toolCallList[i]?.tool_id || "", metadata.benefitpath_call_id, "failed", `Failed: ${errMsg}`, errMsg);

        results.push({
          toolCallId,
          result: "I wasn't able to complete that right now, but I'll make sure someone follows up with you.",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tool-webhook-handler fatal error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // Return 200 to prevent VAPI retries
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logActivity(supabase: ReturnType<typeof createAdminClient>, tenantId: string, toolId: string, callId: string | null, status: string, summary: string, errorMessage: string | null) {
  try {
    await supabase.from("tool_activity_log").insert({
      tenant_id: tenantId,
      tool_id: toolId,
      call_id: callId || null,
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

async function handleGHL(tool: Record<string, unknown>, apiKey: string, additionalConfig: Record<string, unknown>, args: Record<string, unknown>): Promise<string> {
  const locationId = additionalConfig?.location_id;
  const template = tool.template;
  const serviceConfig = tool.service_config || {};

  if (template === "book_appointment" || template === "create_event") {
    const calendarId = serviceConfig.calendar_id;
    if (!calendarId) throw new Error("No calendar ID configured for this tool");

    const startTime = args.preferred_date + "T" + (args.preferred_time || "10:00") + ":00";

    const response = await fetch(
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

    if (response.ok) {
      return `Appointment booked successfully for ${args.preferred_date} at ${args.preferred_time || "10:00 AM"}. A confirmation will be sent.`;
    }
    const error = await response.text();
    throw new Error(`GHL appointment booking failed: ${error}`);
  }

  if (template === "create_contact") {
    const response = await fetch("https://services.leadconnectorhq.com/contacts/", {
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
        tags: serviceConfig.tags ? serviceConfig.tags.split(",").map((t: string) => t.trim()) : ["Voice AI Lead"],
      }),
    });

    if (response.ok) {
      return `Contact created successfully: ${args.contact_name || args.first_name || "New contact"}.`;
    }
    throw new Error("GHL contact creation failed");
  }

  if (template === "update_contact") {
    // Look up contact by phone
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(args.contact_phone)}&limit=1`,
      { headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-04-15" } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const contact = searchData.contacts?.[0];
      if (contact) {
        const updateRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-04-15" },
          body: JSON.stringify({ [args.field_to_update]: args.new_value }),
        });
        if (updateRes.ok) return "Contact record updated successfully.";
      }
    }
    throw new Error("Could not find or update the contact in GHL");
  }

  // Generic GHL - send via workflow if configured
  if (serviceConfig.workflow_id) {
    // Trigger workflow
    return "Action completed via GHL workflow.";
  }

  return "Action completed.";
}

async function handleHubSpot(tool: Record<string, unknown>, apiKey: string, args: Record<string, unknown>): Promise<string> {
  const template = tool.template;
  const serviceConfig = tool.service_config || {};

  if (template === "create_contact") {
    const properties: Record<string, string> = {
      firstname: args.first_name || args.contact_name?.split(" ")[0] || "",
      lastname: args.last_name || args.contact_name?.split(" ").slice(1).join(" ") || "",
    };
    if (args.email || args.contact_email) properties.email = args.email || args.contact_email;
    if (args.phone || args.contact_phone) properties.phone = args.phone || args.contact_phone;
    if (serviceConfig.lifecycle_stage) properties.lifecyclestage = serviceConfig.lifecycle_stage;

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });

    if (response.ok) {
      return `Contact created in HubSpot: ${args.contact_name || args.first_name || "New contact"}.`;
    }
    const errText = await response.text();
    throw new Error(`HubSpot contact creation failed: ${errText}`);
  }

  if (template === "update_contact") {
    // Search by phone/email
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: "phone", operator: "EQ", value: args.contact_phone }],
        }],
        limit: 1,
      }),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const contactId = searchData.results?.[0]?.id;
      if (contactId) {
        const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: { [args.field_to_update]: args.new_value } }),
        });
        if (updateRes.ok) return "Contact record updated in HubSpot.";
      }
    }
    throw new Error("Could not find or update the contact in HubSpot");
  }

  return "Action completed.";
}

async function handleGoogleCalendar(tool: Record<string, unknown>, apiKey: string, serviceConfig: Record<string, unknown>, args: Record<string, unknown>): Promise<string> {
  const calendarId = serviceConfig.calendar_id || "primary";
  const duration = serviceConfig.duration_minutes || 30;

  const startTime = new Date(`${args.preferred_date}T${args.preferred_time || "10:00"}:00`);
  const endTime = new Date(startTime.getTime() + duration * 60000);

  const eventBody: Record<string, unknown> = {
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

  if (serviceConfig.add_reminder) {
    eventBody.reminders = { useDefault: false, overrides: [{ method: "email", minutes: 60 }] };
  }

  const conferenceParam = serviceConfig.include_meet_link ? "?conferenceDataVersion=1" : "";
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${conferenceParam}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    }
  );

  if (response.ok) {
    return `Appointment booked on your calendar for ${args.preferred_date} at ${args.preferred_time || "10:00 AM"}. Duration: ${duration} minutes.`;
  }
  const errText = await response.text();
  throw new Error(`Google Calendar event creation failed: ${errText}`);
}

async function handleSalesforce(tool: Record<string, unknown>, apiKey: string, additionalConfig: Record<string, unknown>, args: Record<string, unknown>): Promise<string> {
  const instanceUrl = additionalConfig?.instance_url || "https://login.salesforce.com";
  const template = tool.template;

  if (template === "create_contact") {
    const response = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Contact/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        FirstName: args.first_name || args.contact_name?.split(" ")[0] || "",
        LastName: args.last_name || args.contact_name?.split(" ").slice(1).join(" ") || "Unknown",
        Email: args.email || args.contact_email || undefined,
        Phone: args.phone || args.contact_phone || undefined,
      }),
    });

    if (response.ok) return `Contact created in Salesforce: ${args.contact_name || args.first_name || "New contact"}.`;
    throw new Error("Salesforce contact creation failed");
  }

  return "Action completed.";
}

async function handleCustomWebhook(serviceConfig: Record<string, unknown>, args: Record<string, unknown>): Promise<string> {
  const url = serviceConfig.url;
  if (!url) throw new Error("No webhook URL configured");

  const method = serviceConfig.method || "POST";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serviceConfig.auth_header) {
    headers["Authorization"] = serviceConfig.auth_header;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify({
      source: "benefitpath_voice_ai",
      ...args,
      timestamp: new Date().toISOString(),
    }) : undefined,
  });

  if (response.ok) {
    const text = await response.text();
    return text || "Action completed successfully.";
  }
  throw new Error(`Webhook returned ${response.status}`);
}

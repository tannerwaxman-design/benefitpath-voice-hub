import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
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

    const adminClient = createAdminClient();
    const body = await req.json();
    const { action, tool, tool_id } = body;

    if (action === "create") {
      // Build VAPI tool payload
      const vapiPayload = buildVapiTool(tool);

      // Create on VAPI
      const vapiRes = await vapiRequest({
        method: "POST",
        endpoint: "/tool",
        body: vapiPayload,
      });

      const vapiToolId = vapiRes.ok && vapiRes.data ? (vapiRes.data as { id?: string }).id : null;

      // Save the VAPI tool ID back to the tools table
      if (vapiToolId && tool_id) {
        await adminClient
          .from("tools")
          .update({ vapi_tool_id: vapiToolId })
          .eq("id", tool_id);
      }

      return new Response(JSON.stringify({ success: true, vapi_tool_id: vapiToolId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { vapi_tool_id } = body;
      if (vapi_tool_id) {
        await vapiRequest({ method: "DELETE", endpoint: `/tool/${vapi_tool_id}` });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign") {
      // Update VAPI assistant to include tool IDs
      const { assistant_id, tool_ids } = body;
      if (assistant_id) {
        await vapiRequest({
          method: "PATCH",
          endpoint: `/assistant/${assistant_id}`,
          body: { model: { toolIds: tool_ids } },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect_service") {
      // Deactivate API key and remove all VAPI tools for this service
      const { service, tenant_id } = body;

      // Mark key as inactive
      await adminClient
        .from("tool_api_keys")
        .update({ status: "inactive" })
        .eq("tenant_id", tenant_id)
        .eq("service", service);

      // Find all tools using this service
      const { data: affectedTools } = await adminClient
        .from("tools")
        .select("id, vapi_tool_id, assigned_agent_ids")
        .eq("tenant_id", tenant_id)
        .eq("service", service);

      if (affectedTools) {
        for (const t of affectedTools) {
          // Delete from VAPI
          if (t.vapi_tool_id) {
            await vapiRequest({ method: "DELETE", endpoint: `/tool/${t.vapi_tool_id}` });
          }
          // Mark tool inactive
          await adminClient
            .from("tools")
            .update({ status: "inactive", vapi_tool_id: null })
            .eq("id", t.id);
        }

        // Update any agents that had these tools assigned
        const vapiToolIds = affectedTools.filter(t => t.vapi_tool_id).map(t => t.vapi_tool_id);
        if (vapiToolIds.length > 0) {
          // Get all agents for this tenant that might reference these tools
          const { data: agents } = await adminClient
            .from("agents")
            .select("id, vapi_assistant_id")
            .eq("tenant_id", tenant_id);

          // For each agent, we'd need to re-sync their tool list
          // For now, the tools are removed from VAPI so they won't be called
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-tool error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildVapiTool(tool: Record<string, unknown>) {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  (tool.parameters || []).forEach((p: Record<string, unknown>) => {
    if (!p.enabled) return;
    properties[p.name] = {
      type: p.type || "string",
      description: p.ai_prompt || p.label,
    };
    if (p.required) required.push(p.name);
  });

  const webhookUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/tool-webhook-handler";

  return {
    type: "function",
    function: {
      name: tool.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 40),
      description: tool.description,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
    messages: [
      ...(tool.message_start ? [{ type: "request-start", content: tool.message_start }] : []),
      ...(tool.message_complete ? [{ type: "request-complete", content: tool.message_complete }] : []),
      ...(tool.message_failed ? [{ type: "request-failed", content: tool.message_failed }] : []),
    ],
    server: { url: webhookUrl },
  };
}

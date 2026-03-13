// ============================================================
// EDGE FUNCTION: delete-agent
// Soft-deletes (archives) an agent and removes from VAPI
// ============================================================

import { vapiRequest } from "../_shared/vapi-client.ts";
import {
  getAuthContext,
  corsHeaders,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);

    if (auth.role !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return errorResponse("agent_id is required");
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

    // Fetch agent (RLS ensures tenant isolation)
    const { data: agent, error: fetchErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (fetchErr || !agent) {
      return errorResponse("Agent not found", 404);
    }

    // Check no active campaigns use this agent
    const { data: activeCampaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("agent_id", agent_id)
      .in("status", ["active", "scheduled"])
      .limit(1);

    if (activeCampaigns && activeCampaigns.length > 0) {
      return errorResponse(
        "Cannot delete agent with active campaigns. Pause or cancel them first.",
        409
      );
    }

    // Delete from VAPI if synced
    if (agent.vapi_assistant_id) {
      await vapiRequest({
        method: "DELETE",
        endpoint: `/assistant/${agent.vapi_assistant_id}`,
      });
    }

    // Soft delete (archive)
    const { error: updateErr } = await supabase
      .from("agents")
      .update({ status: "archived" })
      .eq("id", agent_id);

    if (updateErr) {
      return errorResponse("Failed to archive agent: " + updateErr.message, 500);
    }

    return successResponse({ success: true, message: "Agent archived" });
  } catch (err) {
    console.error("delete-agent error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

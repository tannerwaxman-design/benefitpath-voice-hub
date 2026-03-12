import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY")!;
const VAPI_BASE_URL = "https://api.vapi.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch agent (RLS ensures tenant isolation)
    const { data: agent, error: fetchErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (fetchErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: corsHeaders });
    }

    // Check no active campaigns use this agent
    const { data: activeCampaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("agent_id", agent_id)
      .in("status", ["active", "scheduled"])
      .limit(1);

    if (activeCampaigns && activeCampaigns.length > 0) {
      return new Response(JSON.stringify({ error: "Cannot delete agent with active campaigns. Pause or cancel them first." }), {
        status: 409, headers: corsHeaders,
      });
    }

    // Delete from VAPI if synced
    if (agent.vapi_assistant_id) {
      await fetch(`${VAPI_BASE_URL}/assistant/${agent.vapi_assistant_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
      });
    }

    // Soft delete (archive)
    await supabase.from("agents").update({ status: "archived" }).eq("id", agent_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

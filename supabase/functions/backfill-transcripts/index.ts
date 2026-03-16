// Temporary edge function to:
// 1. Fetch a VAPI call to inspect the actual message structure
// 2. Backfill transcripts for recent calls

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();

    // Get recent calls that have transcripts with only user messages or empty transcripts
    const { data: calls, error } = await supabase
      .from("calls")
      .select("id, vapi_call_id")
      .not("vapi_call_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const results: Record<string, unknown>[] = [];

    for (const call of calls || []) {
      try {
        // Fetch full call data from VAPI
        const vapiCall = await vapiRequest(`/call/${call.vapi_call_id}`, {
          method: "GET",
        });

        // Log the first call's full message structure for debugging
        if (results.length === 0) {
          const sampleMessages = (vapiCall.artifact?.messages || vapiCall.messages || []).slice(0, 5);
          console.log("[backfill] Sample VAPI messages structure:", JSON.stringify(sampleMessages, null, 2));
        }

        const rawMessages = vapiCall.artifact?.messages || vapiCall.messages || [];

        // Build transcript keeping both assistant and user messages
        const transcript = rawMessages
          .filter(
            (m: Record<string, unknown>) =>
              m.role === "assistant" || m.role === "user" || m.role === "bot"
          )
          .map((m: Record<string, unknown>) => ({
            role: m.role === "bot" ? "assistant" : m.role,
            text: m.message || m.content || "",
            timestamp: m.secondsFromStart || m.time || 0,
          }))
          .filter((m: Record<string, unknown>) => (m.text as string).length > 0);

        if (transcript.length > 0) {
          await supabase
            .from("calls")
            .update({
              transcript,
              // Also backfill summary and recording if missing
              ...(vapiCall.analysis?.summary ? { summary: vapiCall.analysis.summary } : {}),
              ...(vapiCall.artifact?.recordingUrl || vapiCall.recordingUrl
                ? { recording_url: vapiCall.artifact?.recordingUrl || vapiCall.recordingUrl }
                : {}),
            })
            .eq("id", call.id);

          results.push({
            call_id: call.id,
            vapi_call_id: call.vapi_call_id,
            messages_found: transcript.length,
            roles: [...new Set(rawMessages.map((m: Record<string, unknown>) => m.role))],
            status: "updated",
          });
        } else {
          results.push({
            call_id: call.id,
            vapi_call_id: call.vapi_call_id,
            messages_found: 0,
            raw_count: rawMessages.length,
            roles: [...new Set(rawMessages.map((m: Record<string, unknown>) => m.role))],
            status: "no_transcript",
          });
        }
      } catch (err) {
        results.push({
          call_id: call.id,
          vapi_call_id: call.vapi_call_id,
          status: "error",
          error: String(err),
        });
      }
    }

    return new Response(JSON.stringify({ backfilled: results.length, results }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

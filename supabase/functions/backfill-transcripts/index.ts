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
        const vapiResult = await vapiRequest({
          method: "GET",
          endpoint: `/call/${call.vapi_call_id}`,
        });

        if (!vapiResult.ok || !vapiResult.data) {
          results.push({
            call_id: call.id,
            vapi_call_id: call.vapi_call_id,
            status: "vapi_error",
            error: vapiResult.error,
          });
          continue;
        }

        const vapiCall = vapiResult.data as Record<string, unknown>;
        const artifact = (vapiCall.artifact || {}) as Record<string, unknown>;
        const rawMessages = (artifact.messages || []) as Record<string, unknown>[];

        // Log the first call's message structure for debugging
        if (results.length === 0 && rawMessages.length > 0) {
          console.log("[backfill] Sample VAPI messages (first 5):", JSON.stringify(rawMessages.slice(0, 5), null, 2));
          console.log("[backfill] All unique roles:", [...new Set(rawMessages.map(m => m.role))]);
        }

        // Build transcript keeping both assistant and user messages
        const transcript = rawMessages
          .filter((m) => m.role === "assistant" || m.role === "user" || m.role === "bot")
          .map((m) => ({
            role: m.role === "bot" ? "assistant" : m.role,
            text: (m.message || m.content || "") as string,
            timestamp: (m.secondsFromStart || m.time || 0) as number,
          }))
          .filter((m) => m.text.length > 0);

        const analysis = (vapiCall.analysis || {}) as Record<string, unknown>;

        if (transcript.length > 0) {
          const updatePayload: Record<string, unknown> = { transcript };
          if (analysis.summary) updatePayload.summary = analysis.summary;
          
          const recordingUrl = artifact.recordingUrl || vapiCall.recordingUrl;
          if (recordingUrl) updatePayload.recording_url = recordingUrl;

          await supabase.from("calls").update(updatePayload).eq("id", call.id);

          results.push({
            call_id: call.id,
            vapi_call_id: call.vapi_call_id,
            messages_found: transcript.length,
            roles: [...new Set(rawMessages.map((m) => m.role))],
            assistant_count: transcript.filter(m => m.role === "assistant").length,
            user_count: transcript.filter(m => m.role === "user").length,
            status: "updated",
          });
        } else {
          results.push({
            call_id: call.id,
            vapi_call_id: call.vapi_call_id,
            messages_found: 0,
            raw_count: rawMessages.length,
            roles: [...new Set(rawMessages.map((m) => m.role))],
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

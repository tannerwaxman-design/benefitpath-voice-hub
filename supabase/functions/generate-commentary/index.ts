import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { call_id } = await req.json();
    if (!call_id) throw new Error("call_id required");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if commentary already cached
    const { data: call, error: callErr } = await supabaseAdmin
      .from("calls")
      .select("id, transcript, ai_commentary, quality_score, score_feedback")
      .eq("id", call_id)
      .single();

    if (callErr || !call) throw new Error("Call not found");

    if (call.ai_commentary && Array.isArray(call.ai_commentary) && call.ai_commentary.length > 0) {
      return new Response(JSON.stringify({ commentary: call.ai_commentary, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!call.transcript || !Array.isArray(call.transcript) || call.transcript.length === 0) {
      throw new Error("No transcript available for this call");
    }

    // Format transcript for LLM
    const transcriptText = call.transcript
      .filter((m: any) => (m.text || m.message || m.content || "").length > 0)
      .map((m: any) => {
        const role = m.role === "assistant" || m.role === "bot" ? "Agent" : "Customer";
        const text = m.text || m.message || m.content || "";
        const ts = m.timestamp || m.secondsFromStart || m.time || 0;
        return `[${Math.floor(ts / 60)}:${String(Math.floor(ts % 60)).padStart(2, "0")}] ${role}: "${text}"`;
      })
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a call coach reviewing a sales call for an insurance agency.
Generate timestamped commentary for this call transcript.

For each significant moment, provide:
- timestamp (seconds from start of call)
- type: one of "observation", "strength", "improvement", "objection_detected", "interest_signal", "temperature_change"
- comment: One sentence of coaching insight

Focus on:
- Opening effectiveness
- Objection handling moments
- Interest signals from the caller
- Missed opportunities
- Closing technique
- Any compliance issues

Return ONLY commentary for the most important 8-15 moments. Not every line needs a comment.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `TRANSCRIPT:\n${transcriptText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_commentary",
              description: "Provide timestamped AI coaching commentary for a call",
              parameters: {
                type: "object",
                properties: {
                  comments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        timestamp: { type: "number", description: "Seconds from start of call" },
                        type: {
                          type: "string",
                          enum: ["observation", "strength", "improvement", "objection_detected", "interest_signal", "temperature_change"],
                        },
                        comment: { type: "string", description: "One sentence coaching insight" },
                      },
                      required: ["timestamp", "type", "comment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["comments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_commentary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const commentary = parsed.comments || [];

    // Sort by timestamp
    commentary.sort((a: any, b: any) => a.timestamp - b.timestamp);

    // Cache on the call record
    await supabaseAdmin
      .from("calls")
      .update({ ai_commentary: commentary })
      .eq("id", call_id);

    return new Response(JSON.stringify({ commentary, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-commentary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

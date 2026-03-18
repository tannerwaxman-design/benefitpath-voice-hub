// ============================================================
// EDGE FUNCTION: score-call
//
// Uses Lovable AI to score a call transcript from 1-100
// with detailed breakdown and feedback.
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";

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
    const body = await req.json();
    const { call_id, action } = body;

    if (!call_id) {
      return new Response(JSON.stringify({ error: "call_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();

    // ── REFETCH TRANSCRIPT ACTION ──
    if (action === "refetch_transcript") {
      const { data: call, error: callErr } = await supabase
        .from("calls")
        .select("vapi_call_id")
        .eq("id", call_id)
        .single();

      if (callErr || !call?.vapi_call_id) {
        return new Response(JSON.stringify({ error: "Call not found or no VAPI ID" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { vapiRequest } = await import("../_shared/vapi-client.ts");
      const vapiResult = await vapiRequest({
        method: "GET",
        endpoint: `/call/${call.vapi_call_id}`,
      });

      if (!vapiResult.ok || !vapiResult.data) {
        return new Response(JSON.stringify({ error: "Failed to fetch from VAPI", detail: vapiResult.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vapiCall = vapiResult.data as Record<string, unknown>;
      const artifact = (vapiCall.artifact || {}) as Record<string, unknown>;
      const rawMessages = (artifact.messages || []) as Record<string, unknown>[];

      // Log raw structure for debugging
      if (rawMessages.length > 0) {
        console.log("[refetch] Raw message sample:", JSON.stringify(rawMessages.slice(0, 3)));
        console.log("[refetch] All roles:", [...new Set(rawMessages.map(m => m.role))]);
      }

      const transcript = rawMessages
        .filter((m) => m.role === "assistant" || m.role === "user" || m.role === "bot")
        .map((m) => ({
          role: m.role === "bot" ? "assistant" : m.role,
          text: (m.message || m.content || m.text || "") as string,
          timestamp: (m.secondsFromStart || m.time || 0) as number,
        }))
        .filter((m) => m.text.length > 0);

      if (transcript.length > 0) {
        const analysis = (vapiCall.analysis || {}) as Record<string, unknown>;
        const updatePayload: Record<string, unknown> = { transcript };
        if (analysis.summary) updatePayload.summary = analysis.summary;
        const recordingUrl = artifact.recordingUrl || vapiCall.recordingUrl;
        if (recordingUrl) updatePayload.recording_url = recordingUrl;

        await supabase.from("calls").update(updatePayload).eq("id", call_id);

        return new Response(JSON.stringify({
          updated: true,
          messages_found: transcript.length,
          assistant_count: transcript.filter(m => m.role === "assistant").length,
          user_count: transcript.filter(m => m.role === "user").length,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        updated: false,
        reason: "No transcript messages found in VAPI response",
        raw_count: rawMessages.length,
        roles: [...new Set(rawMessages.map(m => m.role))],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // supabase already declared above

    // Fetch the call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*, agents(agent_name, call_objective)")
      .eq("id", call_id)
      .single();

    if (callError || !call) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip scoring for non-connected calls
    const scorableOutcomes = ["connected", "completed", "transferred"];
    if (!scorableOutcomes.includes(call.outcome)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Non-scorable outcome" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!call.transcript || !Array.isArray(call.transcript) || call.transcript.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No transcript available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build transcript text
    const transcriptText = (call.transcript as Array<{ role: string; text: string }>)
      .map((m) => `${m.role === "assistant" ? "AGENT" : "CONTACT"}: ${m.text}`)
      .join("\n");

    const callObjective = (call as any).agents?.call_objective || "appointment_setting";

    const systemPrompt = `You are a call quality analyst for an insurance agency's AI voice agent.
Score this call from 1-100 based on these criteria:

1. Opening & Hook (10 points): Did the agent grab attention quickly?
2. Value Proposition (10 points): Was the reason for calling clear and compelling?
3. Objection Handling (10 points): Were objections addressed effectively?
4. Discovery Questions (10 points): Did the agent ask good qualifying questions?
5. Call-to-Action (10 points): Was there a clear next step proposed?
6. Professionalism (10 points): Was the tone appropriate and respectful?
7. Compliance (10 points): Were all compliance rules followed (DNC, disclosure, etc.)?
8. Outcome Achievement (10 points): Did the call achieve its objective?
9. Conversation Flow (10 points): Was the conversation natural and well-paced?
10. Overall Effectiveness (10 points): General quality assessment.

You MUST respond using the score_call function.`;

    const userPrompt = `TRANSCRIPT:
${transcriptText}

CALL OBJECTIVE: ${callObjective}
CALL OUTCOME: ${call.outcome}
CALL DURATION: ${call.duration_seconds || 0} seconds`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "score_call",
                description: "Submit the call quality score with breakdown and feedback.",
                parameters: {
                  type: "object",
                  properties: {
                    total_score: {
                      type: "integer",
                      description: "Overall score from 1-100",
                    },
                    breakdown: {
                      type: "object",
                      properties: {
                        opening_hook: { type: "integer", description: "Score out of 10" },
                        value_proposition: { type: "integer", description: "Score out of 10" },
                        objection_handling: { type: "integer", description: "Score out of 10" },
                        discovery_questions: { type: "integer", description: "Score out of 10" },
                        call_to_action: { type: "integer", description: "Score out of 10" },
                        professionalism: { type: "integer", description: "Score out of 10" },
                        compliance: { type: "integer", description: "Score out of 10" },
                        outcome_achievement: { type: "integer", description: "Score out of 10" },
                        conversation_flow: { type: "integer", description: "Score out of 10" },
                        overall_effectiveness: { type: "integer", description: "Score out of 10" },
                      },
                      required: [
                        "opening_hook", "value_proposition", "objection_handling",
                        "discovery_questions", "call_to_action", "professionalism",
                        "compliance", "outcome_achievement", "conversation_flow",
                        "overall_effectiveness",
                      ],
                      additionalProperties: false,
                    },
                    went_well: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-4 bullet points of what went well",
                    },
                    could_improve: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 bullet points of what could improve",
                    },
                  },
                  required: ["total_score", "breakdown", "went_well", "could_improve"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "score_call" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, will retry later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI scoring failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response");
      return new Response(
        JSON.stringify({ error: "AI did not return structured score" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scoreData = JSON.parse(toolCall.function.arguments);

    // Store scores
    await supabase
      .from("calls")
      .update({
        quality_score: Math.min(100, Math.max(1, scoreData.total_score)),
        score_breakdown: scoreData.breakdown,
        score_feedback: {
          went_well: scoreData.went_well,
          could_improve: scoreData.could_improve,
        },
      })
      .eq("id", call_id);

    return new Response(
      JSON.stringify({
        score: scoreData.total_score,
        breakdown: scoreData.breakdown,
        feedback: {
          went_well: scoreData.went_well,
          could_improve: scoreData.could_improve,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("score-call error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

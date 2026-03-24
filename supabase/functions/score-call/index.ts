// ============================================================
// EDGE FUNCTION: score-call
//
// Uses Lovable AI to score a call transcript from 1-100
// with detailed breakdown, feedback, and coaching analysis.
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function deriveCategory(score: number): string {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "needs_improvement";
  return "poor";
}

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

    const callObjective = (call.agents as { call_objective?: string } | null)?.call_objective || "appointment_setting";

    const systemPrompt = `You are a call quality analyst for an insurance agency's AI voice agent.
Score this call from 1-100 and provide detailed coaching analysis.

SCORING CRITERIA (10 points each):
1. Opening & Hook: Did the agent grab attention quickly?
2. Value Proposition: Was the reason for calling clear and compelling?
3. Objection Handling: Were objections addressed effectively?
4. Discovery Questions: Did the agent ask good qualifying questions?
5. Call-to-Action: Was there a clear next step proposed?
6. Professionalism: Was the tone appropriate and respectful?
7. Compliance: Were all compliance rules followed (DNC, disclosure, etc.)?
8. Outcome Achievement: Did the call achieve its objective?
9. Conversation Flow: Was the conversation natural and well-paced?
10. Overall Effectiveness: General quality assessment.

COACHING TAGS (pick all that apply):
- great_opening, great_objection_handling, great_close, great_rapport, great_discovery
- slow_opening, missed_objection, weak_close, too_scripted, too_pushy
- compliance_issue, missed_discovery, successful_booking, callback_secured
- lost_lead, dnc_handled_well

LEAD SCORING: Also evaluate the contact as a lead:
- lead_score (1-100): How likely this person is to become a client
  90-100: Ready to enroll, appointment booked, asking "how do I sign up?"
  70-89: Clearly interested, engaged in conversation, asked specific questions
  50-69: Somewhat interested but non-committal, said "maybe" or "call back later"
  30-49: Not very engaged, gave short answers, seemed uninterested but didn't refuse
  10-29: Clearly not interested but didn't request DNC
  0-9: Requested DNC, wrong number, hostile
- lead_status: One of "hot", "warm", "cold", "dead"
- lead_summary: One sentence about this lead's situation and intent
- recommended_action: What the agent should do next with this lead

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
                description: "Submit the call quality score with breakdown, feedback, and coaching analysis.",
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
                      description: "3-4 bullet points of what went well, referencing specific transcript moments",
                    },
                    could_improve: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 bullet points of what could improve, referencing specific transcript moments",
                    },
                    coaching_tags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of applicable coaching tags from the predefined list",
                    },
                    highlight_moments: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", description: "strength or improvement" },
                          quote: { type: "string", description: "The exact quote from the transcript" },
                          commentary: { type: "string", description: "Why this moment matters and what to do differently" },
                        },
                        required: ["type", "quote", "commentary"],
                        additionalProperties: false,
                      },
                      description: "1-3 specific transcript moments worth reviewing",
                    },
                    script_suggestion: {
                      type: "string",
                      description: "One specific suggestion for improving the agent's script, or empty string if none needed",
                    },
                    lead_score: {
                      type: "integer",
                      description: "Lead quality score 0-100: how likely the contact is to become a client",
                    },
                    lead_status: {
                      type: "string",
                      description: "One of: hot, warm, cold, dead",
                    },
                    lead_summary: {
                      type: "string",
                      description: "One sentence about this lead's situation and intent",
                    },
                    recommended_action: {
                      type: "string",
                      description: "What the agent should do next with this lead",
                    },
                  },
                  required: ["total_score", "breakdown", "went_well", "could_improve", "coaching_tags", "highlight_moments", "script_suggestion", "lead_score", "lead_status", "lead_summary", "recommended_action"],
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

    let scoreData: Record<string, unknown>;
    try {
      scoreData = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse AI scoring response as JSON:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "AI returned malformed JSON in scoring response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof scoreData.total_score !== "number" || !Number.isFinite(scoreData.total_score)) {
      console.error("AI scoring response missing valid total_score:", JSON.stringify(scoreData));
      return new Response(
        JSON.stringify({ error: "AI scoring response missing required field: total_score" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scoreData.breakdown || typeof scoreData.breakdown !== "object") {
      console.error("AI scoring response missing breakdown:", JSON.stringify(scoreData));
      return new Response(
        JSON.stringify({ error: "AI scoring response missing required field: breakdown" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalScore = Math.min(100, Math.max(1, scoreData.total_score));
    const category = deriveCategory(totalScore);

    // Store scores + coaching data
    await supabase
      .from("calls")
      .update({
        quality_score: totalScore,
        score_breakdown: scoreData.breakdown,
        score_feedback: {
          went_well: scoreData.went_well,
          could_improve: scoreData.could_improve,
        },
        coaching_category: category,
        coaching_tags: scoreData.coaching_tags || [],
        coaching_highlights: scoreData.highlight_moments || [],
        coaching_script_suggestion: scoreData.script_suggestion || null,
      })
      .eq("id", call_id);

    // Update lead score on the contact if contact_id exists
    if (call.contact_id && scoreData.lead_score != null && Number.isFinite(scoreData.lead_score as number)) {
      await supabase
        .from("contacts")
        .update({
          lead_score: Math.min(100, Math.max(0, scoreData.lead_score)),
          lead_status: scoreData.lead_status || null,
          lead_summary: scoreData.lead_summary || null,
          recommended_action: scoreData.recommended_action || null,
          lead_score_updated_at: new Date().toISOString(),
        })
        .eq("id", call.contact_id);
    }

    return new Response(
      JSON.stringify({
        score: totalScore,
        category,
        breakdown: scoreData.breakdown,
        feedback: {
          went_well: scoreData.went_well,
          could_improve: scoreData.could_improve,
        },
        coaching_tags: scoreData.coaching_tags,
        highlights: scoreData.highlight_moments,
        script_suggestion: scoreData.script_suggestion,
        lead_score: scoreData.lead_score,
        lead_status: scoreData.lead_status,
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

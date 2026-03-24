// ============================================================
// EDGE FUNCTION: practice-yourself
//
// Supports the "Practice Yourself" training mode where a human
// agent handles a simulated call against an AI lead.
//
// Actions:
//   start   → create session, return AI lead's opening line
//   respond → take the user's message, return lead reply
//   score   → score the completed conversation
// ============================================================

import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

const SCENARIOS: Record<string, { lead_persona: string; first_message: string; lead_name: string }> = {
  medicare_aep_reluctant: {
    lead_name: "Robert",
    lead_persona: `You are playing a reluctant Medicare lead named Robert. You're 67 years old, retired, and already have Medicare coverage. You're skeptical of sales calls. Start hesitant and say things like "I'm not interested, I already have coverage." Push back 2-3 times before slowly opening up IF the agent handles objections well. If they're pushy, get annoyed and want to hang up. Keep responses conversational and short (1-3 sentences). Never break character.`,
    first_message: "Hello?",
  },
  benefits_enrollment_busy: {
    lead_name: "Jennifer",
    lead_persona: `You are playing a busy professional named Jennifer. You're 42, working, and don't have time for phone calls. Start by saying "I'm really busy right now, can you make this quick?" If they can't hook you in 15 seconds, say you need to go. You're interested in benefits but won't admit it easily. Keep responses short and impatient. Never break character.`,
    first_message: "Yeah, hello? Who's this?",
  },
  policy_renewal_price: {
    lead_name: "David",
    lead_persona: `You are playing a price-sensitive lead named David. You're 55 and your current insurance plan is up for renewal. You keep saying "My current plan is cheaper" and "I can't afford to pay more." You need to be convinced with value, not just price. Keep responses conversational and short. Never break character.`,
    first_message: "Hi, what's this about?",
  },
  skeptical_caller: {
    lead_name: "Karen",
    lead_persona: `You are playing a very skeptical person named Karen. You immediately ask "Is this a scam?" and "Are you a robot?" You've been burned by telemarketers before. You need to be won over with authenticity and transparency. Keep responses short and suspicious. Never break character.`,
    first_message: "Who is this? Is this another scam call?",
  },
  aggressive_objector: {
    lead_name: "Mike",
    lead_persona: `You are playing an aggressive person named Mike who doesn't want to be called. Start angry: "Oh great, another sales call." Give the agent ONE chance to say something compelling, but if they stumble, demand to be put on the do-not-call list. Keep responses short and blunt. Never break character.`,
    first_message: "Oh great, another sales call. What do you want?",
  },
};

const DIFFICULTY_MODIFIERS: Record<string, string> = {
  easy: "Be mildly hesitant but ultimately open to conversation. Give in after 1 objection.",
  medium: "Push back 2-3 times before engaging. Be realistic but not impossible to convince.",
  hard: "Be very resistant. Use multiple strong objections. Only engage if the agent is exceptionally skilled. Challenge everything.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);
    const body = await req.json();
    const { action } = body;

    if (!action) return errorResponse("action is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("AI gateway not configured", 500);

    const supabase = createAdminClient();

    const aiCall = async (messages: Array<{ role: string; content: string }>) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 150,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI gateway error ${resp.status}: ${errText}`);
      }
      const data = await resp.json();
      return (data.choices?.[0]?.message?.content || "").trim();
    };

    // ─── START ───────────────────────────────────────────────
    if (action === "start") {
      const { scenario = "medicare_aep_reluctant", difficulty = "medium" } = body;

      const scenarioConfig = SCENARIOS[scenario] || SCENARIOS.medicare_aep_reluctant;

      const { data: session, error: sessionErr } = await supabase
        .from("training_sessions")
        .insert({
          tenant_id: auth.tenantId,
          user_id: auth.userId,
          agent_id: null,
          mode: "practice_yourself",
          scenario,
          difficulty,
          status: "running",
        })
        .select()
        .single();

      if (sessionErr) return errorResponse("Failed to create session: " + sessionErr.message);

      return successResponse({
        session_id: session.id,
        first_message: scenarioConfig.first_message,
        lead_name: scenarioConfig.lead_name,
      });
    }

    // ─── RESPOND ─────────────────────────────────────────────
    if (action === "respond") {
      const { session_id, scenario, difficulty, transcript, user_message } = body;
      if (!session_id || !user_message) {
        return errorResponse("session_id and user_message are required");
      }

      const scenarioConfig = SCENARIOS[scenario] || SCENARIOS.medicare_aep_reluctant;
      const difficultyMod = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.medium;

      const systemPrompt = `${scenarioConfig.lead_persona}\n\nDifficulty level: ${difficultyMod}\n\nIMPORTANT: Stay in character. Keep responses conversational and 1-3 sentences max. Never break character or mention you're an AI.`;

      // Build message history: alternate user (agent) and assistant (lead)
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      for (const t of (transcript || [])) {
        messages.push({
          role: t.role === "lead" ? "assistant" : "user",
          content: t.content,
        });
      }
      messages.push({ role: "user", content: user_message });

      const leadReply = await aiCall(messages);

      // Detect if the conversation should end
      const endPhrases = [
        "do not call me again",
        "put me on the do not call",
        "don't call again",
        "remove my number",
        "goodbye",
        "hanging up",
      ];
      const shouldEnd = endPhrases.some(p => leadReply.toLowerCase().includes(p));

      return successResponse({ lead_reply: leadReply, should_end: shouldEnd });
    }

    // ─── SCORE ───────────────────────────────────────────────
    if (action === "score") {
      const { session_id, scenario, difficulty, transcript } = body;
      if (!session_id || !transcript?.length) {
        return errorResponse("session_id and transcript are required");
      }

      const transcriptText = (transcript as Array<{ role: string; content: string; speaker?: string }>)
        .map(t => `${t.speaker || t.role}: ${t.content}`)
        .join("\n");

      const scorePrompt = `You are a sales training coach evaluating a human agent's performance on a simulated call.

Score this conversation from 1-100 based on these 10 criteria (10 points each):
1. Opening & Hook
2. Value Proposition
3. Objection Handling
4. Discovery Questions
5. Call-to-Action
6. Professionalism
7. Compliance
8. Outcome Achievement
9. Conversation Flow
10. Overall Effectiveness

SCENARIO: ${scenario}
DIFFICULTY: ${difficulty}
NOTE: The "You" / "Agent" lines are the human being evaluated. The lead is an AI.

TRANSCRIPT:
${transcriptText}`;

      const scoreResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a sales coaching assistant. Return structured scoring results." },
            { role: "user", content: scorePrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_score",
              description: "Submit the score and feedback for a human agent's practice call",
              parameters: {
                type: "object",
                properties: {
                  total_score: { type: "number", description: "Overall score 1-100" },
                  breakdown: {
                    type: "object",
                    properties: {
                      opening_hook: { type: "number" },
                      value_proposition: { type: "number" },
                      objection_handling: { type: "number" },
                      discovery_questions: { type: "number" },
                      call_to_action: { type: "number" },
                      professionalism: { type: "number" },
                      compliance: { type: "number" },
                      outcome_achievement: { type: "number" },
                      conversation_flow: { type: "number" },
                      overall_effectiveness: { type: "number" },
                    },
                    required: ["opening_hook", "value_proposition", "objection_handling", "discovery_questions", "call_to_action", "professionalism", "compliance", "outcome_achievement", "conversation_flow", "overall_effectiveness"],
                  },
                  strengths: { type: "array", items: { type: "string" }, description: "3-4 things the human agent did well" },
                  improvements: { type: "array", items: { type: "string" }, description: "2-3 things to improve" },
                  suggested_script: { type: "string", description: "A suggested response for the weakest moment" },
                },
                required: ["total_score", "breakdown", "strengths", "improvements", "suggested_script"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_score" } },
        }),
      });

      let score = 0;
      let scoreBreakdown = {};
      let feedback = { strengths: [] as string[], improvements: [] as string[], suggested_script: "" };

      if (scoreResp.ok) {
        const scoreData = await scoreResp.json();
        const toolCall = scoreData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            score = parsed.total_score;
            scoreBreakdown = parsed.breakdown;
            feedback = {
              strengths: parsed.strengths,
              improvements: parsed.improvements,
              suggested_script: parsed.suggested_script,
            };
          } catch { /* fallback to defaults */ }
        }
      }

      const durationSeconds = transcript.length * 12;

      await supabase
        .from("training_sessions")
        .update({
          status: "completed",
          score,
          score_breakdown: scoreBreakdown,
          feedback,
          transcript,
          duration_seconds: durationSeconds,
        })
        .eq("id", session_id);

      return successResponse({ score, score_breakdown: scoreBreakdown, feedback, duration_seconds: durationSeconds });
    }

    return errorResponse(`Unknown action: ${action}. Use start, respond, or score.`);
  } catch (err) {
    console.error("practice-yourself error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal server error", 500);
  }
});

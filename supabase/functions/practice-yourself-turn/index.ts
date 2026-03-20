import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

const SCENARIOS: Record<string, { lead_persona: string; first_message: string }> = {
  medicare_aep_reluctant: {
    lead_persona: `You are playing a reluctant Medicare lead named Robert. You're 67 years old, retired, and already have Medicare coverage. You're skeptical of sales calls. Start hesitant and say things like "I'm not interested, I already have coverage." Push back 2-3 times before slowly opening up IF the agent handles objections well. If they're pushy, get annoyed and want to hang up.`,
    first_message: "Hello?",
  },
  benefits_enrollment_busy: {
    lead_persona: `You are playing a busy professional named Jennifer. You're 42, working, and don't have time for phone calls. Start by saying "I'm really busy right now, can you make this quick?" If they can't hook you in 15 seconds, say you need to go. You're interested in benefits but won't admit it easily.`,
    first_message: "Yeah, hello? Who's this?",
  },
  policy_renewal_price: {
    lead_persona: `You are playing a price-sensitive lead named David. You're 55 and your current insurance plan is up for renewal. You keep saying "My current plan is cheaper" and "I can't afford to pay more." You need to be convinced with value, not just price.`,
    first_message: "Hi, what's this about?",
  },
  skeptical_caller: {
    lead_persona: `You are playing a very skeptical person named Karen. You immediately ask "Is this a scam?" and "Are you a robot?" You've been burned by telemarketers before. You need to be won over with authenticity and transparency.`,
    first_message: "Who is this? Is this another scam call?",
  },
  aggressive_objector: {
    lead_persona: `You are playing an aggressive person named Mike who doesn't want to be called. Start angry: "Stop calling me!" Give the agent ONE chance to say something compelling, but if they stumble, demand to be put on the do-not-call list.`,
    first_message: "Oh great, another sales call. What do you want?",
  },
};

const DIFFICULTY_MODIFIERS: Record<string, string> = {
  easy: "Be mildly hesitant but ultimately open to conversation. Give in after 1 objection.",
  medium: "Push back 2-3 times before engaging. Be realistic but not impossible to convince.",
  hard: "Be very resistant. Use multiple strong objections. Only engage if the agent is exceptionally skilled.",
};

const SCORE_CATEGORIES = [
  "opening_hook", "value_proposition", "objection_handling",
  "discovery_questions", "call_to_action", "professionalism",
  "compliance", "outcome_achievement", "conversation_flow", "overall_effectiveness",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);
    const supabase = createAdminClient();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse("AI gateway not configured", 503);
    }

    const body = await req.json();
    const { action } = body;

    // ── START: create session and return first lead message ──
    if (action === "start") {
      const { scenario = "medicare_aep_reluctant", difficulty = "medium" } = body;

      const scenarioConfig = SCENARIOS[scenario] ?? SCENARIOS["medicare_aep_reluctant"];

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

      if (sessionErr) {
        return errorResponse("Failed to create session: " + sessionErr.message);
      }

      return successResponse({
        session_id: session.id,
        lead_message: scenarioConfig.first_message,
        is_call_ended: false,
        turn_number: 0,
      });
    }

    // ── TURN: user sent a message, AI responds as lead ──
    if (action === "turn") {
      const { session_id, user_message, conversation_history = [], scenario = "medicare_aep_reluctant", difficulty = "medium" } = body;

      if (!session_id || !user_message) {
        return errorResponse("session_id and user_message are required");
      }

      const scenarioConfig = SCENARIOS[scenario] ?? SCENARIOS["medicare_aep_reluctant"];
      const difficultyMod = DIFFICULTY_MODIFIERS[difficulty] ?? DIFFICULTY_MODIFIERS["medium"];

      const systemPrompt = `${scenarioConfig.lead_persona}\n\nDifficulty: ${difficultyMod}\n\nIMPORTANT: Stay in character at all times. Respond naturally as this person would. Keep responses conversational and short (1-3 sentences). Never break character or mention you're an AI.\n\nIf the call has gone on long enough OR the agent has said something that would naturally end the call (booked appointment, hung up, etc.), add exactly the text "[CALL_ENDED]" at the very end of your response.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversation_history,
        { role: "user", content: user_message },
      ];

      const resp = await fetch("https://api.lovable.app/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 200,
        }),
      });

      if (!resp.ok) {
        return errorResponse("AI service error: " + resp.status, 502);
      }

      const data = await resp.json();
      const rawReply = data.choices?.[0]?.message?.content ?? "...";
      const isCallEnded = rawReply.includes("[CALL_ENDED]");
      const leadMessage = rawReply.replace("[CALL_ENDED]", "").trim();

      return successResponse({
        session_id,
        lead_message: leadMessage,
        is_call_ended: isCallEnded,
      });
    }

    // ── FINISH: score the full conversation ──
    if (action === "finish") {
      const { session_id, transcript = [], scenario = "medicare_aep_reluctant" } = body;

      if (!session_id) {
        return errorResponse("session_id is required");
      }

      const scenarioConfig = SCENARIOS[scenario] ?? SCENARIOS["medicare_aep_reluctant"];

      const transcriptText = transcript
        .map((t: { speaker: string; content: string }) => `${t.speaker}: ${t.content}`)
        .join("\n");

      const scorePrompt = `You are a call quality coach evaluating a human sales rep's performance on a practice call.

Scenario: ${scenario}
Lead persona: ${scenarioConfig.lead_persona.slice(0, 200)}

FULL TRANSCRIPT:
${transcriptText || "(empty call — rep did not respond)"}

Score the human sales rep (NOT the lead) on these dimensions (0-10 each):
${SCORE_CATEGORIES.join(", ")}

Also provide:
- total_score: weighted average * 10 (0-100)
- strengths: 3-4 things the rep did well
- improvements: 2-3 things to work on
- suggested_script: a better response for the weakest moment

Return ONLY valid JSON with keys: total_score, breakdown (object with each category), strengths (array), improvements (array), suggested_script (string).`;

      const scoreResp = await fetch("https://api.lovable.app/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a call quality scoring assistant. Return valid JSON only, no markdown." },
            { role: "user", content: scorePrompt },
          ],
          max_tokens: 800,
        }),
      });

      let score = 0;
      let scoreBreakdown: Record<string, number> = {};
      let feedback = { strengths: [] as string[], improvements: [] as string[], suggested_script: "" };

      if (scoreResp.ok) {
        const scoreData = await scoreResp.json();
        const raw = scoreData.choices?.[0]?.message?.content ?? "{}";
        try {
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          score = parsed.total_score ?? 0;
          scoreBreakdown = parsed.breakdown ?? {};
          feedback = {
            strengths: parsed.strengths ?? [],
            improvements: parsed.improvements ?? [],
            suggested_script: parsed.suggested_script ?? "",
          };
        } catch { /* use defaults */ }
      }

      const durationSeconds = transcript.length * 12;

      const storedTranscript = transcript.map((t: { speaker: string; content: string }) => ({
        role: t.speaker === "You" ? "agent" : "lead",
        content: t.content,
        speaker: t.speaker,
      }));

      await supabase
        .from("training_sessions")
        .update({
          status: "completed",
          score,
          score_breakdown: scoreBreakdown,
          feedback,
          transcript: storedTranscript,
          duration_seconds: durationSeconds,
        })
        .eq("id", session_id)
        .eq("tenant_id", auth.tenantId);

      return successResponse({
        session_id,
        score,
        score_breakdown: scoreBreakdown,
        feedback,
        duration_seconds: durationSeconds,
      });
    }

    return errorResponse("Invalid action. Use: start, turn, or finish");
  } catch (err) {
    console.error("practice-yourself-turn error:", err);
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return errorResponse(err.message, 401);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

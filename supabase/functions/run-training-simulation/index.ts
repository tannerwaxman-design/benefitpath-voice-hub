import {
  corsHeaders,
  getAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

const SCENARIOS: Record<string, { lead_persona: string; first_message: string }> = {
  "medicare_aep_reluctant": {
    lead_persona: `You are playing a reluctant Medicare lead named Robert. You're 67 years old, retired, and already have Medicare coverage. You're skeptical of sales calls. Start hesitant and say things like "I'm not interested, I already have coverage." Push back 2-3 times before slowly opening up IF the agent handles objections well. If they're pushy, get annoyed and want to hang up.`,
    first_message: "Hello?",
  },
  "benefits_enrollment_busy": {
    lead_persona: `You are playing a busy professional named Jennifer. You're 42, working, and don't have time for phone calls. Start by saying "I'm really busy right now, can you make this quick?" If they can't hook you in 15 seconds, say you need to go. You're interested in benefits but won't admit it easily.`,
    first_message: "Yeah, hello? Who's this?",
  },
  "policy_renewal_price": {
    lead_persona: `You are playing a price-sensitive lead named David. You're 55 and your current insurance plan is up for renewal. You keep saying "My current plan is cheaper" and "I can't afford to pay more." You need to be convinced with value, not just price.`,
    first_message: "Hi, what's this about?",
  },
  "skeptical_caller": {
    lead_persona: `You are playing a very skeptical person named Karen. You immediately ask "Is this a scam?" and "Are you a robot?" You've been burned by telemarketers before. You need to be won over with authenticity and transparency.`,
    first_message: "Who is this? Is this another scam call?",
  },
  "aggressive_objector": {
    lead_persona: `You are playing an aggressive person named Mike who doesn't want to be called. Start angry: "Stop calling me!" Give the agent ONE chance to say something compelling, but if they stumble, demand to be put on the do-not-call list.`,
    first_message: "Oh great, another sales call. What do you want?",
  },
};

const DIFFICULTY_MODIFIERS: Record<string, string> = {
  easy: "Be mildly hesitant but ultimately open to conversation. Give in after 1 objection.",
  medium: "Push back 2-3 times before engaging. Be realistic but not impossible to convince.",
  hard: "Be very resistant. Use multiple strong objections. Only engage if the agent is exceptionally skilled. Challenge everything they say.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const auth = await getAuthContext(req);
    const { agent_id, scenario, difficulty, mode } = await req.json();

    if (!agent_id || !scenario) {
      return errorResponse("agent_id and scenario are required");
    }

    const supabase = createAdminClient();

    // Get agent details
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("agent_name, greeting_script, call_objective, compiled_system_prompt, objection_handling, conversation_stages, tone, industry")
      .eq("id", agent_id)
      .eq("tenant_id", auth.tenantId)
      .single();

    if (agentErr || !agent) {
      return errorResponse("Agent not found", 404);
    }

    const scenarioConfig = SCENARIOS[scenario] || SCENARIOS["medicare_aep_reluctant"];
    const difficultyMod = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS["medium"];

    // Create the training session record
    const { data: session, error: sessionErr } = await supabase
      .from("training_sessions")
      .insert({
        tenant_id: auth.tenantId,
        user_id: auth.userId,
        agent_id,
        mode: mode || "test_agent",
        scenario,
        difficulty: difficulty || "medium",
        status: "running",
      })
      .select()
      .single();

    if (sessionErr) {
      return errorResponse("Failed to create session: " + sessionErr.message);
    }

    // Build the simulation using Lovable AI
    const leadPrompt = `${scenarioConfig.lead_persona}\n\nDifficulty: ${difficultyMod}\n\nIMPORTANT: Stay in character at all times. Respond naturally as this person would. Keep responses conversational and short (1-3 sentences). Never break character or mention you're an AI.`;

    const agentSystemPrompt = agent.compiled_system_prompt || 
      `You are ${agent.agent_name}, a ${agent.tone} insurance agent. Your objective is: ${agent.call_objective}. Greeting: ${agent.greeting_script}`;

    // Simulate the conversation turn by turn
    const transcript: Array<{ role: string; content: string; speaker: string }> = [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      await supabase.from("training_sessions").update({ status: "failed" }).eq("id", session.id);
      return errorResponse("AI gateway not configured");
    }

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
          max_tokens: 200,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI gateway error ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    };

    // Lead starts
    transcript.push({ role: "lead", content: scenarioConfig.first_message, speaker: "Lead" });

    const MAX_TURNS = 8;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      // Agent responds
      const agentMessages = [
        { role: "system", content: agentSystemPrompt },
        ...transcript.map(t => ({
          role: t.role === "agent" ? "assistant" : "user",
          content: t.content,
        })),
      ];
      const agentResponse = await aiCall(agentMessages);
      transcript.push({ role: "agent", content: agentResponse, speaker: agent.agent_name });

      // Check if conversation should end
      if (agentResponse.toLowerCase().includes("goodbye") || 
          agentResponse.toLowerCase().includes("have a great day") ||
          turn === MAX_TURNS - 1) break;

      // Lead responds
      const leadMessages = [
        { role: "system", content: leadPrompt },
        ...transcript.map(t => ({
          role: t.role === "lead" ? "assistant" : "user",
          content: t.content,
        })),
      ];
      const leadResponse = await aiCall(leadMessages);
      transcript.push({ role: "lead", content: leadResponse, speaker: "Lead" });

      if (leadResponse.toLowerCase().includes("don't call me again") ||
          leadResponse.toLowerCase().includes("put me on the do not call")) break;
    }

    // Score the conversation
    const scorePrompt = `You are a call quality analyst for an insurance agency's AI voice agent.
Score this simulated training call from 1-100 based on these criteria:

1. Opening & Hook (10 points)
2. Value Proposition (10 points)
3. Objection Handling (10 points)
4. Discovery Questions (10 points)
5. Call-to-Action (10 points)
6. Professionalism (10 points)
7. Compliance (10 points)
8. Outcome Achievement (10 points)
9. Conversation Flow (10 points)
10. Overall Effectiveness (10 points)

SCENARIO: ${scenario}
DIFFICULTY: ${difficulty}
AGENT OBJECTIVE: ${agent.call_objective}

TRANSCRIPT:
${transcript.map(t => `${t.speaker}: ${t.content}`).join("\n")}`;

    const scoreResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a call quality scoring assistant. Return structured results." },
          { role: "user", content: scorePrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_score",
            description: "Submit the call quality score and feedback",
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
                strengths: { type: "array", items: { type: "string" }, description: "3-4 things that went well" },
                improvements: { type: "array", items: { type: "string" }, description: "2-3 things to improve" },
                suggested_script: { type: "string", description: "A suggested script improvement for the weakest area" },
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
        } catch { /* fallback */ }
      }
    }

    const durationSeconds = transcript.length * 15; // rough estimate

    // Update session
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
      .eq("id", session.id);

    return successResponse({
      session_id: session.id,
      score,
      score_breakdown: scoreBreakdown,
      feedback,
      transcript,
      duration_seconds: durationSeconds,
    });
  } catch (err) {
    console.error("Training simulation error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500
    );
  }
});

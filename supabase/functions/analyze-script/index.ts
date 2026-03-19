// ============================================================
// EDGE FUNCTION: analyze-script
//
// Analyzes an agent's call transcripts (successful vs unsuccessful)
// and suggests script improvements using LLM.
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id } = await req.json();

    if (!agent_id) {
      return new Response(JSON.stringify({ error: "agent_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();

    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, agent_name, greeting_script, closing_script, objection_handling, call_objective, conversation_stages")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch successful calls (appointment booked or high score)
    const { data: successCalls } = await supabase
      .from("calls")
      .select("transcript, outcome, quality_score, duration_seconds, detected_intent")
      .eq("agent_id", agent_id)
      .gte("started_at", thirtyDaysAgo.toISOString())
      .not("transcript", "is", null)
      .in("outcome", ["connected", "completed"])
      .order("quality_score", { ascending: false, nullsFirst: false })
      .limit(10);

    // Fetch unsuccessful calls
    const { data: failCalls } = await supabase
      .from("calls")
      .select("transcript, outcome, quality_score, duration_seconds, detected_intent")
      .eq("agent_id", agent_id)
      .gte("started_at", thirtyDaysAgo.toISOString())
      .not("transcript", "is", null)
      .in("outcome", ["connected", "completed"])
      .order("quality_score", { ascending: true, nullsFirst: false })
      .limit(10);

    // Get total call count for stats
    const { count: totalCalls } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent_id)
      .gte("started_at", thirtyDaysAgo.toISOString());

    const formatTranscripts = (calls: any[]) =>
      calls
        .map((c, i) => {
          const lines = (c.transcript as any[])
            .map((m: any) => `${m.role === "assistant" ? "AGENT" : "CONTACT"}: ${m.text}`)
            .join("\n");
          return `--- Call ${i + 1} (Score: ${c.quality_score || "N/A"}, Outcome: ${c.outcome}, Duration: ${c.duration_seconds}s) ---\n${lines}`;
        })
        .join("\n\n");

    const successText = successCalls?.length ? formatTranscripts(successCalls) : "No successful calls available.";
    const failText = failCalls?.length ? formatTranscripts(failCalls) : "No unsuccessful calls available.";

    const objectionText = Array.isArray(agent.objection_handling)
      ? (agent.objection_handling as any[]).map((o: any) => `- "${o.objection}": "${o.response}"`).join("\n")
      : "None configured";

    const systemPrompt = `You are a script optimization analyst for an AI voice agent platform. 
Analyze call transcripts to find patterns in what works vs what doesn't, then suggest specific script improvements.
Be specific, cite evidence from transcripts, and provide actionable before/after text changes.
You MUST respond using the analyze_script function.`;

    const userPrompt = `Analyze these call transcripts from "${agent.agent_name}" (${totalCalls || 0} total calls in the last 30 days).

SUCCESSFUL CALLS (highest scoring / best outcomes):
${successText}

UNSUCCESSFUL CALLS (lowest scoring / worst outcomes):
${failText}

CURRENT AGENT SCRIPTS:
Greeting: ${agent.greeting_script || "Not set"}
Closing: ${agent.closing_script || "Not set"}
Objection handlers:
${objectionText}
Call Objective: ${agent.call_objective}

Based on patterns in what works vs what doesn't, provide your analysis.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_script",
              description: "Return script analysis with what's working and suggested improvements.",
              parameters: {
                type: "object",
                properties: {
                  whats_working: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        insight: { type: "string", description: "What's working well" },
                        evidence: { type: "string", description: "Specific evidence from transcripts" },
                        metric: { type: "string", description: "A relevant metric or stat if available" },
                      },
                      required: ["insight", "evidence"],
                      additionalProperties: false,
                    },
                    description: "3-5 things that are working well",
                  },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string", description: "Area: opening, objection, closing, discovery, or general" },
                        title: { type: "string", description: "Short title for the suggestion" },
                        current_text: { type: "string", description: "The current script text that should change" },
                        suggested_text: { type: "string", description: "The improved script text" },
                        reasoning: { type: "string", description: "Why this change would improve outcomes, with evidence" },
                        expected_impact: { type: "string", description: "Estimated improvement e.g. '15-20% higher engagement'" },
                      },
                      required: ["area", "title", "current_text", "suggested_text", "reasoning"],
                      additionalProperties: false,
                    },
                    description: "2-4 specific script change suggestions",
                  },
                  discovery_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Questions that correlate with better outcomes",
                  },
                  phrases_to_avoid: {
                    type: "array",
                    items: { type: "string" },
                    description: "Phrases or approaches that seem to hurt outcomes",
                  },
                },
                required: ["whats_working", "suggestions", "discovery_questions", "phrases_to_avoid"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_script" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
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
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        agent_id: agent.id,
        agent_name: agent.agent_name,
        total_calls: totalCalls || 0,
        analyzed_at: new Date().toISOString(),
        ...analysis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-script error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

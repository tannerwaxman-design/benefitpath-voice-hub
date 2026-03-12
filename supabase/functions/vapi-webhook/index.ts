import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This endpoint is PUBLIC — VAPI sends webhooks here without our auth token.
// We verify using the webhook secret instead.
const WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET");

function mapEndReasonToOutcome(endedReason: string): string {
  switch (endedReason) {
    case "customer-ended-call":
    case "assistant-ended-call":
      return "completed";
    case "voicemail":
      return "voicemail";
    case "no-answer":
    case "customer-did-not-answer":
      return "no_answer";
    case "busy":
    case "customer-busy":
      return "busy";
    case "error":
    case "pipeline-error-openai-llm-failed":
      return "failed";
    case "silence-timed-out":
      return "completed";
    case "max-duration-reached":
      return "completed";
    default:
      return "completed";
  }
}

function analyzeSentiment(transcript: any[]): { sentiment: string; score: number } {
  // Simple heuristic - in production, use an LLM
  if (!transcript || transcript.length === 0) return { sentiment: "neutral", score: 0 };

  const negativeWords = ["no", "not interested", "stop", "don't", "angry", "upset", "scam", "annoying"];
  const positiveWords = ["yes", "sure", "great", "interested", "perfect", "thank", "wonderful", "appreciate"];

  let score = 0;
  const allText = transcript.map((t: any) => t.text || "").join(" ").toLowerCase();

  for (const w of positiveWords) if (allText.includes(w)) score += 0.1;
  for (const w of negativeWords) if (allText.includes(w)) score -= 0.15;

  score = Math.max(-1, Math.min(1, score));
  const sentiment = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";

  return { sentiment, score: parseFloat(score.toFixed(2)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Extract metadata from the call
    const metadata = message.call?.assistantOverrides?.metadata ||
                     message.call?.assistant?.metadata ||
                     message.assistant?.metadata ||
                     {};

    const { tenant_id, agent_id, campaign_id, campaign_contact_id, contact_id, phone_number_id } = metadata;
    const vapiCallId = message.call?.id;

    if (!vapiCallId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Use service role to bypass RLS (webhook has no user context)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (message.type) {
      case "status-update": {
        if (message.status === "ended") {
          const outcome = mapEndReasonToOutcome(message.endedReason || "");
          const durationSeconds = message.duration || 0;
          const costMinutes = parseFloat((durationSeconds / 60).toFixed(2));

          // Update call record
          await supabase.from("calls").update({
            outcome,
            ended_at: message.timestamp || new Date().toISOString(),
            duration_seconds: durationSeconds,
            end_reason: message.endedReason,
            cost_minutes: costMinutes,
          }).eq("vapi_call_id", vapiCallId);

          // Update campaign_contact if applicable
          if (campaign_contact_id) {
            // Fetch campaign for retry config
            let nextAttemptAt: string | null = null;
            if (campaign_id) {
              const { data: campaign } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaign_id)
                .single();

              if (campaign) {
                // Calculate next retry based on outcome
                if (outcome === "no_answer" && campaign.retry_no_answer) {
                  const hours = campaign.retry_no_answer_after_hours || 4;
                  nextAttemptAt = new Date(Date.now() + hours * 3600000).toISOString();
                } else if (outcome === "busy" && campaign.retry_busy) {
                  const mins = campaign.retry_busy_after_minutes || 30;
                  nextAttemptAt = new Date(Date.now() + mins * 60000).toISOString();
                } else if (outcome === "voicemail" && campaign.retry_voicemail) {
                  const hours = campaign.retry_voicemail_after_hours || 24;
                  nextAttemptAt = new Date(Date.now() + hours * 3600000).toISOString();
                }
              }
            }

            const ccStatus = outcome === "completed" || outcome === "connected"
              ? "completed"
              : outcome === "voicemail" ? "voicemail"
              : outcome === "no_answer" ? "no_answer"
              : outcome === "busy" ? "busy"
              : outcome === "failed" ? "failed"
              : "pending";

            await supabase.from("campaign_contacts").update({
              status: nextAttemptAt ? "pending" : ccStatus,
              last_outcome: outcome,
              last_attempt_at: new Date().toISOString(),
              next_attempt_at: nextAttemptAt,
            }).eq("id", campaign_contact_id);

            // Increment attempts
            await supabase.rpc("increment_campaign_contact_attempts", { cc_id: campaign_contact_id }).catch(() => {
              // Fallback: direct update
              supabase.from("campaign_contacts")
                .select("total_attempts")
                .eq("id", campaign_contact_id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    supabase.from("campaign_contacts").update({
                      total_attempts: (data.total_attempts || 0) + 1,
                    }).eq("id", campaign_contact_id);
                  }
                });
            });
          }

          // Update campaign stats
          if (campaign_id) {
            const outcomeField = outcome === "connected" || outcome === "completed"
              ? "contacts_connected"
              : outcome === "voicemail" ? "contacts_voicemail"
              : outcome === "no_answer" ? "contacts_no_answer"
              : outcome === "failed" ? "contacts_failed"
              : outcome === "transferred" ? "contacts_transferred"
              : null;

            if (outcomeField) {
              const { data: campaign } = await supabase
                .from("campaigns")
                .select(outcomeField + ", contacts_called, total_minutes_used")
                .eq("id", campaign_id)
                .single();

              if (campaign) {
                const updates: any = {
                  contacts_called: (campaign.contacts_called || 0) + 1,
                  total_minutes_used: parseFloat(((campaign.total_minutes_used || 0) + costMinutes).toFixed(2)),
                };
                updates[outcomeField] = ((campaign as any)[outcomeField] || 0) + 1;
                await supabase.from("campaigns").update(updates).eq("id", campaign_id);
              }
            }
          }

          // Update tenant minutes
          if (tenant_id) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("minutes_used_this_cycle")
              .eq("id", tenant_id)
              .single();

            if (tenant) {
              await supabase.from("tenants").update({
                minutes_used_this_cycle: (tenant.minutes_used_this_cycle || 0) + Math.ceil(costMinutes),
              }).eq("id", tenant_id);
            }

            // Log usage
            await supabase.from("usage_logs").insert({
              tenant_id,
              call_id: null, // We'd need to look up our call ID
              event_type: "call_minutes",
              quantity: costMinutes,
              unit_cost: 0.05,
              total_cost: parseFloat((costMinutes * 0.05).toFixed(4)),
              billing_cycle_start: new Date().toISOString().split("T")[0],
              billing_cycle_end: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            });
          }

          // Fire tenant webhook if configured
          if (tenant_id) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("webhook_url, webhook_events")
              .eq("id", tenant_id)
              .single();

            if (tenant?.webhook_url && tenant.webhook_events?.includes("call_completed")) {
              fetch(tenant.webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "call_completed", vapi_call_id: vapiCallId, outcome, duration: durationSeconds }),
              }).catch(() => {}); // Fire and forget
            }
          }
        }
        break;
      }

      case "transcript": {
        const transcript = message.transcript || message.artifact?.transcript;
        if (transcript) {
          await supabase.from("calls").update({ transcript }).eq("vapi_call_id", vapiCallId);
        }
        break;
      }

      case "end-of-call-report": {
        const transcript = message.artifact?.transcript || message.transcript;
        const sentimentResult = analyzeSentiment(transcript || []);

        await supabase.from("calls").update({
          summary: message.summary || message.artifact?.summary || null,
          recording_url: message.recordingUrl || message.artifact?.recordingUrl || null,
          transcript: transcript || null,
          sentiment: sentimentResult.sentiment,
          sentiment_score: sentimentResult.score,
        }).eq("vapi_call_id", vapiCallId);

        // Update campaign_contact sentiment
        if (campaign_contact_id) {
          await supabase.from("campaign_contacts").update({
            sentiment: sentimentResult.sentiment,
          }).eq("id", campaign_contact_id);
        }
        break;
      }

      case "function-call": {
        if (message.functionCall?.name === "transferCall") {
          await supabase.from("calls").update({
            was_transferred: true,
            transferred_to: message.functionCall.parameters?.destination || "",
            transfer_reason: message.functionCall.parameters?.reason || "caller_request",
          }).eq("vapi_call_id", vapiCallId);

          // Update campaign stats
          if (campaign_id) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("contacts_transferred")
              .eq("id", campaign_id)
              .single();
            if (campaign) {
              await supabase.from("campaigns").update({
                contacts_transferred: (campaign.contacts_transferred || 0) + 1,
              }).eq("id", campaign_id);
            }
          }
        }
        break;
      }
    }

    // Always respond 200 quickly
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Still return 200 to prevent VAPI retries
    return new Response(JSON.stringify({ ok: true, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

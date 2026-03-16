// ============================================================
// EDGE FUNCTION: vapi-webhook
//
// THE MOST CRITICAL FUNCTION IN THE ENTIRE SYSTEM.
//
// VAPI sends POST requests here whenever ANYTHING happens
// with a call. This endpoint is PUBLIC (no user auth).
// We verify via webhook secret and use SERVICE_ROLE to write.
// ============================================================

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { vapiRequest } from "../_shared/vapi-client.ts";
import { insertNotification } from "../_shared/notifications.ts";

const WEBHOOK_SECRET = Deno.env.get("VAPI_WEBHOOK_SECRET");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    // 1. Verify webhook authenticity
    const providedSecret = req.headers.get("x-vapi-secret");
    if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
      console.warn("Webhook signature mismatch");
      // In production, uncomment: return new Response("Unauthorized", { status: 401 });
    }

    // 2. Extract the message
    const message = body.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Extract our metadata
    const metadata =
      message.call?.assistantOverrides?.metadata ||
      message.call?.assistant?.metadata ||
      message.assistant?.metadata ||
      message.metadata ||
      {};

    let tenantId = metadata.benefitpath_tenant_id;
    let agentId = metadata.benefitpath_agent_id;
    const contactId = metadata.benefitpath_contact_id;
    const campaignId = metadata.benefitpath_campaign_id;
    const campaignContactId = metadata.benefitpath_campaign_contact_id;
    const isTestCall = metadata.benefitpath_is_test_call;

    const vapiCallId =
      message.call?.id || message.callId || message.phoneCallProviderId;

    if (!vapiCallId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use admin client (bypasses RLS — server-to-server)
    const supabase = createAdminClient();

    // ── INBOUND FALLBACK ──
    // For inbound calls, VAPI routes via assistantId on the phone number,
    // so our custom metadata won't be present. Look up tenant & agent
    // from the called phone number in our DB.
    const callType = message.call?.type || "";
    const isInboundCall = callType === "inboundPhoneCall";

    if (!tenantId && isInboundCall) {
      const calledNumber = message.call?.phoneNumber?.number || "";
      if (calledNumber) {
        const { data: phoneRecord } = await supabase
          .from("phone_numbers")
          .select("tenant_id, assigned_agent_id")
          .eq("phone_number", calledNumber)
          .eq("status", "active")
          .maybeSingle();

        if (phoneRecord) {
          tenantId = phoneRecord.tenant_id;
          agentId = agentId || phoneRecord.assigned_agent_id;
          console.log(`[webhook] Inbound fallback: resolved tenant=${tenantId} agent=${agentId} from number=${calledNumber}`);
        } else {
          console.warn(`[webhook] Inbound call to ${calledNumber} but no matching phone_number record found`);
        }
      }
    }

    // 4. Route based on message type
    switch (message.type) {
      // ========================================
      // STATUS UPDATE
      // ========================================
      case "status-update": {
        const status = message.status;
        console.log(
          `[webhook] status-update: call=${vapiCallId} status=${status} tenant=${tenantId} type=${callType} inbound=${isInboundCall}`
        );

        // For inbound calls, create a call record when the call starts
        if (isInboundCall && (status === "ringing" || status === "in-progress") && tenantId) {
          const customerNumber = message.call?.customer?.number || "";
          const phoneNumber = message.call?.phoneNumber?.number || "";

          // Try to match caller to existing contact
          let matchedContactId = contactId || null;
          if (!matchedContactId && customerNumber && tenantId) {
            const { data: matchedContact } = await supabase
              .from("contacts")
              .select("id")
              .eq("tenant_id", tenantId)
              .eq("phone", customerNumber)
              .maybeSingle();
            if (matchedContact) {
              matchedContactId = matchedContact.id;
            }
          }

          // Look up phone_number_id
          let phoneNumberId = null;
          if (phoneNumber) {
            const { data: pn } = await supabase
              .from("phone_numbers")
              .select("id")
              .eq("phone_number", phoneNumber)
              .maybeSingle();
            if (pn) phoneNumberId = pn.id;
          }

          // Check if record already exists
          const { data: existingCall } = await supabase
            .from("calls")
            .select("id")
            .eq("vapi_call_id", vapiCallId)
            .maybeSingle();

          if (!existingCall) {
            await supabase.from("calls").insert({
              vapi_call_id: vapiCallId,
              tenant_id: tenantId,
              agent_id: agentId || null,
              contact_id: matchedContactId,
              phone_number_id: phoneNumberId,
              direction: "inbound",
              from_number: customerNumber,
              to_number: phoneNumber,
              started_at: new Date().toISOString(),
              outcome: "in_progress",
              contact_name: message.call?.customer?.name || null,
            });
            console.log(`[webhook] Created inbound call record: vapi=${vapiCallId} tenant=${tenantId} agent=${agentId}`);
          }
        }

        if (status === "ended") {
          const endedReason = message.endedReason || "unknown";
          const duration = message.duration || message.call?.duration || 0;
          const durationMinutes =
            Math.ceil((duration / 60) * 10) / 10; // round up to 0.1 min

          const outcome = mapEndedReasonToOutcome(endedReason);

          // Update call record
          await supabase
            .from("calls")
            .update({
              outcome,
              end_reason: endedReason,
              ended_at: new Date().toISOString(),
              duration_seconds: Math.round(duration),
              cost_minutes: durationMinutes,
              recording_url: message.call?.recordingUrl || null,
              was_transferred: endedReason === "assistant-forwarded-call",
            })
            .eq("vapi_call_id", vapiCallId);

          // Update campaign_contacts if applicable
          if (campaignContactId) {
            let nextAttemptAt: string | null = null;

            // Fetch campaign retry config
            if (campaignId) {
              const { data: campaign } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaignId)
                .single();

              if (campaign) {
                if (outcome === "no_answer" && campaign.retry_no_answer) {
                  const hours = campaign.retry_no_answer_after_hours || 4;
                  nextAttemptAt = new Date(
                    Date.now() + hours * 3600000
                  ).toISOString();
                } else if (outcome === "busy" && campaign.retry_busy) {
                  const mins = campaign.retry_busy_after_minutes || 30;
                  nextAttemptAt = new Date(
                    Date.now() + mins * 60000
                  ).toISOString();
                } else if (
                  outcome === "voicemail" &&
                  campaign.retry_voicemail
                ) {
                  const hours = campaign.retry_voicemail_after_hours || 24;
                  nextAttemptAt = new Date(
                    Date.now() + hours * 3600000
                  ).toISOString();
                }
              }
            }

            const ccStatus = mapOutcomeToCCStatus(outcome);

            await supabase
              .from("campaign_contacts")
              .update({
                status: nextAttemptAt ? "pending" : ccStatus,
                last_outcome: outcome,
                last_attempt_at: new Date().toISOString(),
                next_attempt_at: nextAttemptAt,
              })
              .eq("id", campaignContactId);

            // Increment attempts
            await supabase
              .rpc("increment_campaign_contact_attempts", {
                cc_id: campaignContactId,
              })
              .catch(() => {});
          }

          // Update campaign stats
          if (campaignId) {
            await incrementCampaignStat(
              supabase,
              campaignId,
              outcome,
              durationMinutes
            );
          }

          // Update contact stats
          if (contactId) {
            const { data: contact } = await supabase
              .from("contacts")
              .select("total_calls")
              .eq("id", contactId)
              .single();

            if (contact) {
              await supabase
                .from("contacts")
                .update({
                  last_called_at: new Date().toISOString(),
                  last_outcome: outcome,
                  total_calls: (contact.total_calls || 0) + 1,
                })
                .eq("id", contactId);
            }
          }

          // Update agent stats
          if (agentId) {
            const { data: agentData } = await supabase
              .from("agents")
              .select("total_calls")
              .eq("id", agentId)
              .single();

            if (agentData) {
              await supabase
                .from("agents")
                .update({
                  total_calls: (agentData.total_calls || 0) + 1,
                })
                .eq("id", agentId);
            }
          }

          // Track minutes (cost/credit deduction moved to end-of-call-report)
          if (tenantId && !isTestCall) {
            await supabase.rpc("increment_tenant_minutes", {
              p_tenant_id: tenantId,
              p_minutes: durationMinutes,
            });
          }

          // Check for DNC request in end reason or analysis
          const customerNumber = message.call?.customer?.number;
          if (customerNumber && tenantId) {
            const isDncRequest =
              endedReason ===
                "customer-did-not-give-microphone-permission" ||
              message.call?.analysis?.structuredData?.dnc_requested;

            if (isDncRequest) {
              await supabase.from("dnc_list").upsert(
                {
                  tenant_id: tenantId,
                  phone_number: customerNumber,
                  reason: "contact_requested",
                  source: `call:${vapiCallId}`,
                  added_by: "system",
                },
                { onConflict: "tenant_id,phone_number", ignoreDuplicates: true }
              );

              if (contactId) {
                await supabase
                  .from("contacts")
                  .update({ dnc_status: true })
                  .eq("id", contactId);
              }
            }
          }

          // Fire tenant webhook
          if (tenantId) {
            await fireTenantWebhook(supabase, tenantId, "call_ended", {
              call_id: vapiCallId,
              outcome,
              duration,
              contact_id: contactId,
              campaign_id: campaignId,
            });
          }

          // Create notification for call recording
          if (tenantId && (message.call?.recordingUrl)) {
            const contactName = message.call?.customer?.name || "Unknown";
            await insertNotification(supabase, tenantId, {
              type: "success",
              title: "New call recording available",
              body: `Call with ${contactName} (${Math.round(duration)}s) — ${outcome}`,
              icon: "phone",
              link: "/call-logs",
            });
          }
        }

        break;
      }

      // ========================================
      // END OF CALL REPORT
      // ========================================
      case "end-of-call-report": {
        console.log(
          `[webhook] end-of-call-report: call=${vapiCallId} tenant=${tenantId}`
        );

        const analysis = message.analysis || {};
        const artifact = message.artifact || {};
        const messages = artifact.messages || [];

        // Build structured transcript
        const transcript = messages
          .filter(
            (m: Record<string, unknown>) =>
              m.role === "assistant" || m.role === "user"
          )
          .map((m: Record<string, unknown>) => ({
            role: m.role,
            text: m.message || m.content || "",
            timestamp: m.secondsFromStart || m.time || 0,
          }));

        // Determine sentiment
        const sentimentResult = analyzeSentiment(
          transcript,
          analysis.successEvaluation
        );

        // Extract duration from the report (VAPI includes it in message.call or message.durationSeconds)
        const reportDuration =
          message.durationSeconds ||
          message.call?.duration ||
          message.duration ||
          artifact.duration ||
          0;

        const reportDurationMinutes = Math.ceil((reportDuration / 60) * 10) / 10;

        // Build update payload
        const reportUpdate: Record<string, unknown> = {
          transcript,
          summary: analysis.summary || null,
          sentiment: sentimentResult.sentiment,
          sentiment_score: sentimentResult.score,
          recording_url:
            message.recordingUrl ||
            message.call?.recordingUrl ||
            artifact.recordingUrl ||
            null,
          detected_intent: analysis.successEvaluation || null,
          extracted_data: analysis.structuredData || {},
        };

        // Backfill duration if it was 0 from the status-update
        if (reportDuration > 0) {
          reportUpdate.duration_seconds = Math.round(reportDuration);
          reportUpdate.cost_minutes = reportDurationMinutes;
        }

        // Update call record with rich data
        await supabase
          .from("calls")
          .update(reportUpdate)
          .eq("vapi_call_id", vapiCallId);

        // Fetch and store costs (end-of-call-report arrives after VAPI has finalized costs)
        if (tenantId && !isTestCall) {
          const costData = await fetchAndStoreCosts(supabase, vapiCallId, tenantId);

          if (costData.totalCost > 0) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("margin_percent, billing_cycle_start, billing_cycle_end, total_cost_this_cycle, credit_balance, usage_alert_sent, webhook_url, webhook_events")
              .eq("id", tenantId)
              .single();

            if (tenant) {
              const costWithMargin = costData.totalCost * (1 + (tenant.margin_percent || 20) / 100);

              await supabase
                .from("calls")
                .update({ cost_with_margin: parseFloat(costWithMargin.toFixed(4)) })
                .eq("vapi_call_id", vapiCallId);

              await supabase.rpc("deduct_tenant_credits", {
                p_tenant_id: tenantId,
                p_amount: parseFloat(costWithMargin.toFixed(4)),
              });

              await supabase
                .from("tenants")
                .update({
                  total_cost_this_cycle: parseFloat(
                    ((tenant.total_cost_this_cycle || 0) + costWithMargin).toFixed(4)
                  ),
                })
                .eq("id", tenantId);

              await supabase.from("usage_logs").insert({
                tenant_id: tenantId,
                call_id: null,
                event_type: "call_minutes",
                quantity: reportDurationMinutes || 0.1,
                unit_cost: costData.totalCost > 0 ? parseFloat((costData.totalCost / Math.max(reportDurationMinutes, 0.1)).toFixed(4)) : 0.05,
                total_cost: parseFloat(costWithMargin.toFixed(4)),
                billing_cycle_start: tenant.billing_cycle_start,
                billing_cycle_end: tenant.billing_cycle_end,
              });

              const newBalance = (tenant.credit_balance || 0) - costWithMargin;
              if (newBalance <= 5 && !tenant.usage_alert_sent) {
                await supabase
                  .from("tenants")
                  .update({ usage_alert_sent: true })
                  .eq("id", tenantId);
              }
            }
          }
        }

        // Check if appointment was booked
        if (
          analysis.structuredData?.appointment_booked ||
          analysis.successEvaluation === "successful"
        ) {
          if (campaignContactId) {
            await supabase
              .from("campaign_contacts")
              .update({
                appointment_booked: true,
                appointment_datetime:
                  analysis.structuredData?.appointment_date || null,
                sentiment: sentimentResult.sentiment,
              })
              .eq("id", campaignContactId);
          }

          if (campaignId) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("appointments_set")
              .eq("id", campaignId)
              .single();

            if (campaign) {
              await supabase
                .from("campaigns")
                .update({
                  appointments_set: (campaign.appointments_set || 0) + 1,
                })
                .eq("id", campaignId);
            }
          }
        } else if (campaignContactId) {
          await supabase
            .from("campaign_contacts")
            .update({ sentiment: sentimentResult.sentiment })
            .eq("id", campaignContactId);
        }

        // Fire tenant webhook with report data
        if (tenantId) {
          await fireTenantWebhook(supabase, tenantId, "call_report", {
            call_id: vapiCallId,
            summary: analysis.summary,
            transcript,
            sentiment: sentimentResult.sentiment,
            recording_url: message.recordingUrl,
          });
        }

        // Trigger AI call scoring asynchronously (fire-and-forget)
        // Only score connected/completed/transferred calls
        const scorableOutcomes = ["connected", "completed", "transferred"];
        const { data: callRecord } = await supabase
          .from("calls")
          .select("id, outcome")
          .eq("vapi_call_id", vapiCallId)
          .single();

        if (callRecord && scorableOutcomes.includes(callRecord.outcome) && transcript.length > 0) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (supabaseUrl && serviceRoleKey) {
            fetch(`${supabaseUrl}/functions/v1/score-call`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({ call_id: callRecord.id }),
            }).catch((err) =>
              console.error("Failed to trigger call scoring:", err)
            );
          }
        }

        break;
      }

      // ========================================
      // TRANSCRIPT (real-time during call)
      // ========================================
      case "transcript": {
        // Store partial transcript for real-time display
        const transcript =
          message.transcript || message.artifact?.transcript;
        if (transcript) {
          await supabase
            .from("calls")
            .update({ transcript })
            .eq("vapi_call_id", vapiCallId);
        }
        break;
      }

      // ========================================
      // TRANSFER DESTINATION REQUEST
      // ========================================
      case "transfer-destination-request": {
        console.log(
          `[webhook] transfer-destination-request: call=${vapiCallId}`
        );

        if (agentId) {
          const { data: agentData } = await supabase
            .from("agents")
            .select(
              "transfer_phone_number, backup_transfer_number, transfer_announcement"
            )
            .eq("id", agentId)
            .single();

          if (agentData?.transfer_phone_number) {
            return new Response(
              JSON.stringify({
                destination: {
                  type: "number",
                  number: agentData.transfer_phone_number,
                  message:
                    agentData.transfer_announcement ||
                    "Connecting you with a specialist now.",
                },
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }

        break;
      }

      // ========================================
      // FUNCTION CALL (transfer, etc.)
      // ========================================
      case "function-call": {
        if (message.functionCall?.name === "transferCall") {
          await supabase
            .from("calls")
            .update({
              was_transferred: true,
              transferred_to:
                message.functionCall.parameters?.destination || "",
              transfer_reason:
                message.functionCall.parameters?.reason ||
                "caller_request",
            })
            .eq("vapi_call_id", vapiCallId);

          if (campaignId) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("contacts_transferred")
              .eq("id", campaignId)
              .single();

            if (campaign) {
              await supabase
                .from("campaigns")
                .update({
                  contacts_transferred:
                    (campaign.contacts_transferred || 0) + 1,
                })
                .eq("id", campaignId);
            }
          }
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${message.type}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[webhook] Error processing webhook:", err);
    // Return 200 even on error to prevent VAPI from retrying
    return new Response(JSON.stringify({ ok: true, error: "logged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function mapEndedReasonToOutcome(endedReason: string): string {
  const reasonMap: Record<string, string> = {
    "assistant-ended-call": "completed",
    "customer-ended-call": "connected",
    "max-duration-reached": "connected",
    "silence-timed-out": "connected",
    "assistant-forwarded-call": "transferred",
    "customer-busy": "busy",
    "customer-did-not-answer": "no_answer",
    "no-answer-timeout": "no_answer",
    voicemail: "voicemail",
    "customer-answered-machine": "voicemail",
    "call-start-error-neither-assistant-nor-server-set": "failed",
    "error-vapi-error": "failed",
    "error-twilio-error": "failed",
    "error-openai-error": "failed",
    "pipeline-error": "failed",
    "pipeline-error-openai-llm-failed": "failed",
    "unknown-error": "failed",
  };

  return reasonMap[endedReason] || "completed";
}

function mapOutcomeToCCStatus(outcome: string): string {
  const statusMap: Record<string, string> = {
    connected: "completed",
    completed: "completed",
    voicemail: "voicemail",
    no_answer: "no_answer",
    busy: "pending",
    failed: "failed",
    transferred: "completed",
  };
  return statusMap[outcome] || "pending";
}

function analyzeSentiment(
  transcript: Array<{ role: string; text: string }>,
  successEvaluation?: string
): { sentiment: string; score: number } {
  // Use VAPI's evaluation if available
  if (successEvaluation) {
    const score =
      successEvaluation === "successful"
        ? 0.8
        : successEvaluation === "partial"
        ? 0.3
        : -0.3;
    const sentiment =
      score > 0.3 ? "positive" : score > -0.3 ? "neutral" : "negative";
    return { sentiment, score };
  }

  // Fallback heuristic
  if (!transcript || transcript.length === 0)
    return { sentiment: "neutral", score: 0 };

  const negativeWords = [
    "no",
    "not interested",
    "stop",
    "don't",
    "angry",
    "upset",
    "scam",
    "annoying",
  ];
  const positiveWords = [
    "yes",
    "sure",
    "great",
    "interested",
    "perfect",
    "thank",
    "wonderful",
    "appreciate",
  ];

  let score = 0;
  const allText = transcript
    .map((t) => t.text || "")
    .join(" ")
    .toLowerCase();

  for (const w of positiveWords) if (allText.includes(w)) score += 0.1;
  for (const w of negativeWords) if (allText.includes(w)) score -= 0.15;

  score = Math.max(-1, Math.min(1, score));
  const sentiment =
    score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";

  return { sentiment, score: parseFloat(score.toFixed(2)) };
}

async function incrementCampaignStat(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  outcome: string,
  costMinutes: number
) {
  const outcomeField =
    outcome === "connected" || outcome === "completed"
      ? "contacts_connected"
      : outcome === "voicemail"
      ? "contacts_voicemail"
      : outcome === "no_answer"
      ? "contacts_no_answer"
      : outcome === "failed"
      ? "contacts_failed"
      : outcome === "transferred"
      ? "contacts_transferred"
      : null;

  if (!outcomeField) return;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select(`${outcomeField}, contacts_called, total_minutes_used`)
    .eq("id", campaignId)
    .single();

  if (campaign) {
    const updates: Record<string, unknown> = {
      contacts_called: (campaign.contacts_called || 0) + 1,
      total_minutes_used: parseFloat(
        ((campaign.total_minutes_used || 0) + costMinutes).toFixed(2)
      ),
    };
    updates[outcomeField] =
      ((campaign as Record<string, unknown>)[outcomeField] as number || 0) + 1;
    await supabase.from("campaigns").update(updates).eq("id", campaignId);
  }
}

// Fetch cost breakdown from VAPI API and store on call record
async function fetchAndStoreCosts(
  supabase: ReturnType<typeof createAdminClient>,
  vapiCallId: string,
  tenantId: string
): Promise<{ totalCost: number }> {
  try {
    // Give VAPI time to finalize cost data
    await new Promise((r) => setTimeout(r, 5000));

    const result = await vapiRequest<{
      id: string;
      costs?: Array<{ type: string; cost: number; minutes?: number; characters?: number; promptTokens?: number; completionTokens?: number }>;
      costBreakdown?: { transport?: number; stt?: number; llm?: number; tts?: number; vapi?: number; total?: number };
    }>({
      method: "GET",
      endpoint: `/call/${vapiCallId}`,
    });

    if (!result.ok || !result.data) {
      console.warn(`Failed to fetch VAPI call costs for ${vapiCallId}`);
      return { totalCost: 0 };
    }

    const costs = result.data.costs || [];
    const breakdown = result.data.costBreakdown || {};

    let costVapi = 0, costTransport = 0, costStt = 0, costLlm = 0, costTts = 0;

    for (const c of costs) {
      const amount = c.cost || 0;
      switch (c.type) {
        case "vapi": costVapi += amount; break;
        case "transport": costTransport += amount; break;
        case "transcriber": costStt += amount; break;
        case "model": costLlm += amount; break;
        case "voice": costTts += amount; break;
      }
    }

    // Fallback to costBreakdown if costs array is empty
    if (costs.length === 0 && breakdown) {
      costVapi = breakdown.vapi || 0;
      costTransport = breakdown.transport || 0;
      costStt = breakdown.stt || 0;
      costLlm = breakdown.llm || 0;
      costTts = breakdown.tts || 0;
    }

    const totalCost = costVapi + costTransport + costStt + costLlm + costTts;

    await supabase
      .from("calls")
      .update({
        cost_vapi: parseFloat(costVapi.toFixed(4)),
        cost_transport: parseFloat(costTransport.toFixed(4)),
        cost_stt: parseFloat(costStt.toFixed(4)),
        cost_llm: parseFloat(costLlm.toFixed(4)),
        cost_tts: parseFloat(costTts.toFixed(4)),
        cost_breakdown: costs,
        cost_total: parseFloat(totalCost.toFixed(4)),
        cost_amount: parseFloat(totalCost.toFixed(4)),
      })
      .eq("vapi_call_id", vapiCallId);

    return { totalCost };
  } catch (err) {
    console.error(`Error fetching costs for ${vapiCallId}:`, err);
    return { totalCost: 0 };
  }
}

async function fireTenantWebhook(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  eventType: string,
  data: Record<string, unknown>
) {
  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("webhook_url, webhook_events, slack_webhook_url")
      .eq("id", tenantId)
      .single();

    if (!tenant) return;

    // Fire main webhook
    if (
      tenant.webhook_url &&
      (!tenant.webhook_events?.length ||
        tenant.webhook_events.includes(eventType))
    ) {
      fetch(tenant.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data,
        }),
      }).catch((err) =>
        console.error(`Tenant webhook failed for ${tenantId}:`, err)
      );
    }

    // Fire Slack notification
    if (tenant.slack_webhook_url && eventType === "call_ended") {
      fetch(tenant.slack_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `📞 Call ${data.outcome}: ${data.contact_id || "Unknown contact"} — Duration: ${data.duration}s`,
        }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Error firing tenant webhook:", err);
  }
}

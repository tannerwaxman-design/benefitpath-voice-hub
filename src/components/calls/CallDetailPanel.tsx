import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, Send, Star, Bot, User, RefreshCw } from "lucide-react";
import AiCommentaryPlayer from "./AiCommentaryPlayer";
import { Progress } from "@/components/ui/progress";
import type { Json } from "@/integrations/supabase/types";
import { useCoachingNotes, useAddCoachingNote, useTranscriptComments, useAddTranscriptComment, useUpdateReviewStatus } from "@/hooks/use-coaching";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const outcomeColors: Record<string, string> = {
  connected: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  voicemail: "bg-blue-50 text-blue-600",
  no_answer: "bg-warning/10 text-warning",
  transferred: "bg-purple-50 text-purple-600",
  busy: "bg-pink-50 text-pink-600",
  failed: "bg-destructive/10 text-destructive",
  in_progress: "bg-blue-50 text-blue-600",
};

const reviewStatusOptions = [
  { value: "not_reviewed", label: "Not Reviewed" },
  { value: "reviewed", label: "Reviewed" },
  { value: "flagged_for_training", label: "Flagged for Training" },
  { value: "needs_improvement", label: "Needs Improvement" },
  { value: "excellent_example", label: "Excellent Example" },
];

const reviewStatusColors: Record<string, string> = {
  not_reviewed: "bg-secondary text-muted-foreground",
  reviewed: "bg-success/10 text-success",
  flagged_for_training: "bg-blue-100 text-blue-700",
  needs_improvement: "bg-destructive/10 text-destructive",
  excellent_example: "bg-amber-100 text-amber-700",
};

export type CallWithRelations = {
  id: string;
  contact_name: string | null;
  to_number: string;
  from_number: string;
  direction: string;
  started_at: string;
  duration_seconds: number | null;
  outcome: string;
  sentiment: string | null;
  sentiment_score: number | null;
  summary: string | null;
  transcript: Json | null;
  recording_url: string | null;
  detected_intent: string | null;
  extracted_data: Json | null;
  end_reason: string | null;
  was_transferred: boolean;
  cost_with_margin: number | null;
  cost_total: number | null;
  review_status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  internal_notes?: string | null;
  tenant_id: string;
  agents: { agent_name: string } | null;
  campaigns: { name: string } | null;
  vapi_call_id?: string;
  quality_score?: number | null;
  score_breakdown?: Json | null;
  score_feedback?: Json | null;
};

function formatDate(dt: string) {
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(s: number | null) {
  if (!s) return "0:00";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function CallDetailPanel({ call, onClose }: { call: CallWithRelations; onClose: () => void }) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [commentingIndex, setCommentingIndex] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isRefetching, setIsRefetching] = useState(false);

  const { data: notes } = useCoachingNotes(call.id);
  const addNote = useAddCoachingNote();
  const { data: transcriptComments } = useTranscriptComments(call.id);
  const addComment = useAddTranscriptComment();
  const updateReview = useUpdateReviewStatus();

  const commentsByIndex = useMemo(() => {
    const map: Record<number, typeof transcriptComments> = {};
    for (const c of transcriptComments || []) {
      if (!map[c.message_index]) map[c.message_index] = [];
      map[c.message_index]!.push(c);
    }
    return map;
  }, [transcriptComments]);

  const handleSaveNote = () => {
    if (!newNote.trim() || !user) return;
    addNote.mutate({
      call_id: call.id,
      tenant_id: user.tenant_id,
      author_user_id: user.id,
      author_email: user.email || "",
      note: newNote.trim(),
    });
    setNewNote("");
  };

  const handleAddComment = (index: number) => {
    if (!commentText.trim() || !user) return;
    addComment.mutate({
      call_id: call.id,
      tenant_id: user.tenant_id,
      author_user_id: user.id,
      author_email: user.email || "",
      message_index: index,
      comment: commentText.trim(),
    });
    setCommentText("");
    setCommentingIndex(null);
  };

  const handleReviewChange = (status: string) => {
    if (!user) return;
    updateReview.mutate({ callId: call.id, review_status: status, reviewed_by: user.id });
  };

  const handleRefetchTranscript = async () => {
    if (!call.vapi_call_id) {
      toast.error("No call ID found for this call");
      return;
    }
    setIsRefetching(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/score-call`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refetch_transcript", call_id: call.id }),
        }
      );
      const result = await resp.json();
      if (result.updated) {
        toast.success(`Transcript refreshed: ${result.messages_found} messages found`);
        // Reload page to show updated transcript
        window.location.reload();
      } else {
        toast.info(result.reason || "No transcript data available from provider");
      }
    } catch (err) {
      toast.error("Failed to refetch transcript");
    } finally {
      setIsRefetching(false);
    }
  };

  const currentStatus = call.review_status || "not_reviewed";
  const agentName = call.agents?.agent_name || "AI Agent";

  // Parse transcript messages, handling both {text} and {message} fields
  const transcriptMessages = useMemo(() => {
    if (!call.transcript || !Array.isArray(call.transcript)) return [];
    return (call.transcript as Array<Record<string, unknown>>)
      .map((msg) => ({
        role: (msg.role as string) || "user",
        text: ((msg.text || msg.message || msg.content || "") as string),
        timestamp: ((msg.timestamp || msg.secondsFromStart || msg.time || 0) as number),
      }))
      .filter((msg) => msg.text.length > 0);
  }, [call.transcript]);

  const hasAssistantMessages = transcriptMessages.some(m => m.role === "assistant" || m.role === "bot");

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{call.contact_name || "Unknown Contact"}</SheetTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={`${outcomeColors[call.outcome] || ""} border-0 text-[10px]`}>{call.outcome.replace("_", " ")}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(call.started_at)} • {formatDuration(call.duration_seconds)}</span>
        </div>
      </SheetHeader>

      {/* Review Status Bar */}
      <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Review Status</span>
          <Select value={currentStatus} onValueChange={handleReviewChange}>
            <SelectTrigger className="w-52 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reviewStatusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className={`${reviewStatusColors[currentStatus]} border-0 text-[10px]`}>
          {reviewStatusOptions.find(o => o.value === currentStatus)?.label}
        </Badge>
        {call.reviewed_at && (
          <p className="text-xs text-muted-foreground">
            Reviewed: {formatDate(call.reviewed_at)}
          </p>
        )}
      </div>

      {/* Recording Player with AI Commentary */}
      {call.recording_url && (
        <AiCommentaryPlayer callId={call.id} recordingUrl={call.recording_url} />
      )}

      {/* Summary */}
      {call.summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="section-label mb-2">AI-Generated Summary</p>
          <p className="text-sm text-foreground">{call.summary}</p>
        </div>
      )}

      {/* Call Quality Score Card */}
      {call.quality_score != null && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Call Quality Score: {call.quality_score}/100</span>
              </div>
              <span className={`text-lg font-bold ${
                call.quality_score >= 80 ? "text-success" :
                call.quality_score >= 60 ? "text-warning" : "text-destructive"
              }`}>
                {call.quality_score}
              </span>
            </div>
            <Progress value={call.quality_score} className="h-2" />

            {call.score_feedback && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(call.score_feedback as any).went_well?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-success mb-1.5">✅ What went well</p>
                    <ul className="space-y-1">
                      {(call.score_feedback as any).went_well.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(call.score_feedback as any).could_improve?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-warning mb-1.5">⚡ Could improve</p>
                    <ul className="space-y-1">
                      {(call.score_feedback as any).could_improve.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {call.score_breakdown && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">📊 Score Breakdown</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    ["Opening & Hook", "opening_hook"],
                    ["Value Proposition", "value_proposition"],
                    ["Objection Handling", "objection_handling"],
                    ["Discovery Questions", "discovery_questions"],
                    ["Call-to-Action", "call_to_action"],
                    ["Professionalism", "professionalism"],
                    ["Compliance", "compliance"],
                    ["Outcome Achievement", "outcome_achievement"],
                    ["Conversation Flow", "conversation_flow"],
                    ["Overall Effectiveness", "overall_effectiveness"],
                  ].map(([label, key]) => (
                    <div key={key} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium text-foreground">{(call.score_breakdown as any)[key]}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript with chat-style UI */}
      {transcriptMessages.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Full Transcript</p>
            {!hasAssistantMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefetchTranscript}
                disabled={isRefetching}
                className="text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Fetching..." : "Reload Transcript"}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {transcriptMessages.map((msg, i) => {
              const isAssistant = msg.role === "assistant" || msg.role === "bot";
              return (
                <div key={i}>
                  {/* Message header with role label and timestamp */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isAssistant ? "" : "justify-end"}`}>
                    {isAssistant && <Bot className="h-3.5 w-3.5 text-primary" />}
                    <span className={`text-[11px] font-medium ${isAssistant ? "text-primary" : "text-muted-foreground"}`}>
                      {isAssistant ? agentName : "Customer"}
                    </span>
                    {msg.timestamp > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    )}
                    {!isAssistant && <User className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} group`}>
                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-sm relative ${
                        isAssistant
                          ? "bg-primary/10 text-foreground rounded-tl-sm"
                          : "bg-secondary text-foreground rounded-tr-sm"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentingIndex(commentingIndex === i ? null : i);
                          setCommentText("");
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/50"
                        title="Add comment"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Existing comments for this line */}
                  {commentsByIndex[i]?.map(c => (
                    <div key={c.id} className={`${isAssistant ? "ml-4" : "mr-4 ml-auto max-w-[80%]"} mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-xs`}>
                      <span className="font-medium text-amber-800">{c.author_email.split("@")[0]}:</span>{" "}
                      <span className="text-amber-700">{c.comment}</span>
                    </div>
                  ))}

                  {/* Inline comment form */}
                  {commentingIndex === i && (
                    <div className={`${isAssistant ? "ml-4" : "mr-4 ml-auto max-w-[80%]"} mt-1 flex gap-1.5`}>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Add a comment on this line..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddComment(i); }}
                        autoFocus
                      />
                      <Button size="sm" className="h-8 px-2" onClick={() => handleAddComment(i)} disabled={!commentText.trim()}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Show refetch button even when no transcript */
        call.duration_seconds && call.duration_seconds > 5 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">No transcript data available yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefetchTranscript}
              disabled={isRefetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              {isRefetching ? "Fetching..." : "Fetch Transcript from Provider"}
            </Button>
          </div>
        ) : null
      )}

      {/* Extracted Data */}
      {call.extracted_data && Object.keys(call.extracted_data as Record<string, unknown>).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Detected Data Points</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(call.extracted_data as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="text-foreground">{String(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Coaching Notes */}
      <div>
        <p className="section-label mb-3">Coaching Notes</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              className="min-h-[60px] text-sm"
              placeholder="Add a note about this call for coaching or training..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveNote} disabled={!newNote.trim() || addNote.isPending}>
              {addNote.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>

          {notes && notes.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground font-medium">Previous Notes:</p>
              {notes.map(n => (
                <div key={n.id} className="p-3 rounded-lg border bg-secondary/20 text-sm">
                  <p className="text-foreground">"{n.note}"</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.author_email.split("@")[0]} — {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* No data state */}
      {!call.summary && transcriptMessages.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Detailed call data will appear here once the call ends and is processed.</p>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { useCalls } from "@/hooks/use-calls";
import { useCoachingNotes, useAddCoachingNote, useTranscriptComments, useAddTranscriptComment, useUpdateReviewStatus } from "@/hooks/use-coaching";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Play, Search, ArrowUpRight, ArrowDownLeft, MessageSquare, Send, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Json } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

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

const sentimentColors: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-warning",
  negative: "bg-destructive",
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

type CallWithRelations = {
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
};

function CallDetailPanel({ call, onClose }: { call: CallWithRelations; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");
  const [commentingIndex, setCommentingIndex] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

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

  function formatDate(dt: string) {
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatDuration(s: number | null) {
    if (!s) return "0:00";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const currentStatus = (call as any).review_status || "not_reviewed";

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{call.contact_name || "Unknown Contact"}</SheetTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={`${outcomeColors[call.outcome] || ""} border-0 text-[10px]`}>{call.outcome.replace("_", " ")}</Badge>
          {call.sentiment && <span className={`h-2 w-2 rounded-full ${sentimentColors[call.sentiment]}`} />}
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
        {(call as any).reviewed_at && (
          <p className="text-xs text-muted-foreground">
            Reviewed: {formatDate((call as any).reviewed_at)}
          </p>
        )}
      </div>

      {/* Recording Player */}
      {call.recording_url && (
        <div className="bg-secondary/30 rounded-lg p-4">
          <audio controls className="w-full" src={call.recording_url} />
        </div>
      )}

      {/* Summary */}
      {call.summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="section-label mb-2">AI-Generated Summary</p>
          <p className="text-sm text-foreground">{call.summary}</p>
        </div>
      )}

      {/* Call Quality Score Card */}
      {(call as any).quality_score != null && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Call Quality Score: {(call as any).quality_score}/100</span>
              </div>
              <span className={`text-lg font-bold ${
                (call as any).quality_score >= 80 ? "text-success" :
                (call as any).quality_score >= 60 ? "text-warning" : "text-destructive"
              }`}>
                {(call as any).quality_score}
              </span>
            </div>
            <Progress value={(call as any).quality_score} className="h-2" />

            {(call as any).score_feedback && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(call as any).score_feedback.went_well?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-success mb-1.5">✅ What went well</p>
                    <ul className="space-y-1">
                      {(call as any).score_feedback.went_well.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(call as any).score_feedback.could_improve?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-warning mb-1.5">⚡ Could improve</p>
                    <ul className="space-y-1">
                      {(call as any).score_feedback.could_improve.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {(call as any).score_breakdown && (
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
                      <span className="font-medium text-foreground">{(call as any).score_breakdown[key]}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript with inline comments */}
      {call.transcript && Array.isArray(call.transcript) && (call.transcript as Array<{ role: string; text: string; timestamp: number }>).length > 0 && (
        <div>
          <p className="section-label mb-3">Full Transcript</p>
          <div className="space-y-3">
            {(call.transcript as Array<{ role: string; text: string; timestamp: number }>).map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"} group`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm relative ${msg.role === "assistant" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                    <p>{msg.text}</p>
                    <div className="flex items-center justify-between mt-1">
                      {msg.timestamp > 0 && <p className="text-[10px] text-muted-foreground">{Math.floor(msg.timestamp / 60)}:{String(Math.floor(msg.timestamp % 60)).padStart(2, "0")}</p>}
                      <button
                        onClick={(e) => { e.stopPropagation(); setCommentingIndex(commentingIndex === i ? null : i); setCommentText(""); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/50"
                        title="Add comment"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Existing comments for this line */}
                {commentsByIndex[i]?.map(c => (
                  <div key={c.id} className={`${msg.role === "assistant" ? "ml-4" : "mr-4 ml-auto max-w-[80%]"} mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-xs`}>
                    <span className="font-medium text-amber-800">{c.author_email.split("@")[0]}:</span>{" "}
                    <span className="text-amber-700">{c.comment}</span>
                  </div>
                ))}

                {/* Inline comment form */}
                {commentingIndex === i && (
                  <div className={`${msg.role === "assistant" ? "ml-4" : "mr-4 ml-auto max-w-[80%]"} mt-1 flex gap-1.5`}>
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
            ))}
          </div>
        </div>
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
      {!call.summary && !call.transcript && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Detailed call data will appear here once the call ends and is processed.</p>
        </div>
      )}
    </div>
  );
}

export default function CallLogs() {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<CallWithRelations | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const { data: calls, isLoading } = useCalls({ outcome: outcomeFilter, direction: directionFilter, search, limit: 200 });

  const paged = useMemo(() => {
    const list = calls || [];
    return list.slice(page * perPage, (page + 1) * perPage);
  }, [calls, page]);

  const totalPages = Math.ceil((calls?.length || 0) / perPage);

  function formatDuration(s: number | null) {
    if (!s) return "0:00";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function formatDate(dt: string) {
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Call Logs</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Call Logs</h1>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={outcomeFilter} onValueChange={v => { setOutcomeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "connected", "completed", "voicemail", "no_answer", "transferred", "busy", "failed"].map(s => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Outcomes" : s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={v => { setDirectionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Calls</SelectItem>
            <SelectItem value="outbound">Outbound Only</SelectItem>
            <SelectItem value="inbound">Inbound Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(!calls || calls.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No calls yet</p>
            <p className="text-sm text-muted-foreground">Calls will appear here once your agents start making them.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["", "Date / Time", "Contact", "Agent", "Duration", "Outcome", "Review", ""].map(h => (
                    <th key={h || "actions"} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((call: any, i: number) => (
                  <tr key={call.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedCall(call)}>
                    <td className="px-4 py-3">
                      {call.direction === "inbound"
                        ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                        : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(call.started_at)}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-foreground">{call.contact_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{call.to_number}</p></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{call.agents?.agent_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={`${outcomeColors[call.outcome] || "bg-secondary"} border-0 text-[10px]`}>{call.outcome.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`${reviewStatusColors[call.review_status || "not_reviewed"] || "bg-secondary"} border-0 text-[10px]`}>
                        {reviewStatusOptions.find(o => o.value === (call.review_status || "not_reviewed"))?.label || "Not Reviewed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{call.recording_url && <button className="p-1 rounded hover:bg-secondary"><Play className="h-4 w-4 text-muted-foreground" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Showing {page * perPage + 1}-{Math.min((page + 1) * perPage, calls?.length || 0)} of {calls?.length || 0}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Detail Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-auto">
          {selectedCall && <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

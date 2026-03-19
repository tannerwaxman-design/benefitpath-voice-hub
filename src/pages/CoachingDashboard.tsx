import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CallDetailPanel, { type CallWithRelations } from "@/components/calls/CallDetailPanel";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCallsForCoaching,
  useCoachingStats,
  useScoreDistribution,
  useTopCoachingTags,
  useUpdateReviewStatus,
} from "@/hooks/use-coaching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Play,
  TrendingUp,
  BarChart3,
  Tag,
  Eye,
} from "lucide-react";

const tagLabels: Record<string, string> = {
  great_opening: "Great Opening",
  great_objection_handling: "Great Objection Handling",
  great_close: "Great Close",
  great_rapport: "Great Rapport",
  great_discovery: "Great Discovery",
  slow_opening: "Slow Opening",
  missed_objection: "Missed Objection",
  weak_close: "Weak Close",
  too_scripted: "Too Scripted",
  too_pushy: "Too Pushy",
  compliance_issue: "Compliance Issue",
  missed_discovery: "Missed Discovery",
  successful_booking: "Successful Booking",
  callback_secured: "Callback Secured",
  lost_lead: "Lost Lead",
  dnc_handled_well: "DNC Handled Well",
};

function categoryBadge(category: string, score: number) {
  if (category === "excellent") return <Badge className="bg-emerald-500/20 text-emerald-600 border-0">EXCELLENT</Badge>;
  if (category === "good") return <Badge className="bg-blue-500/20 text-blue-600 border-0">GOOD</Badge>;
  if (category === "needs_improvement") return <Badge className="bg-amber-500/20 text-amber-600 border-0">NEEDS IMPROVEMENT</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-0">POOR</Badge>;
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-destructive";
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CoachingDashboard() {
  const { user } = useAuth();
  const [selectedCall, setSelectedCall] = useState<CallWithRelations | null>(null);
  const { data: stats, isLoading: statsLoading } = useCoachingStats();
  const { data: needsReviewCalls, isLoading: nrLoading } = useCallsForCoaching("needs_review");
  const { data: excellentCalls, isLoading: exLoading } = useCallsForCoaching("excellent");
  const { data: flaggedCalls, isLoading: flLoading } = useCallsForCoaching("flagged");
  const { data: distribution } = useScoreDistribution();
  const { data: topTags } = useTopCoachingTags();
  const updateReview = useUpdateReviewStatus();

  const handleMarkReviewed = (callId: string) => {
    if (!user?.id) return;
    updateReview.mutate({ callId, review_status: "reviewed", reviewed_by: user.id });
  };

  const handleFlag = (callId: string) => {
    if (!user?.id) return;
    updateReview.mutate({ callId, review_status: "flagged_for_training", reviewed_by: user.id });
  };

  const handleResolveFlag = (callId: string) => {
    if (!user?.id) return;
    updateReview.mutate({ callId, review_status: "reviewed", reviewed_by: user.id });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Coaching</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI analyzes every call and highlights what's working and what needs attention. Review calls, leave notes, and improve your agent's scripts.
        </p>
      </div>

      {/* Stats Bar */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Needs Review</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.needs_review}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Avg Score (7d)</span>
              </div>
              <p className={`text-2xl font-bold ${scoreColor(stats.avg_score)}`}>{stats.avg_score || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Excellent (7d)</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.excellent_this_week}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Needs Work (7d)</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.needs_work_this_week}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 1: Needs Your Review */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Needs Your Review</CardTitle>
            <Badge variant="secondary" className="text-[10px] border-0">{needsReviewCalls?.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {nrLoading ? (
            <Skeleton className="h-32" />
          ) : !needsReviewCalls?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">All caught up — no calls need review right now.</p>
          ) : (
            <div className="space-y-3">
              {needsReviewCalls.map((call: any) => {
                const feedback = call.score_feedback as any;
                const firstImprovement = feedback?.could_improve?.[0];
                return (
                  <div key={call.id} className="p-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg font-bold ${scoreColor(call.quality_score)}`}>{call.quality_score}</span>
                          {categoryBadge(call.coaching_category || "poor", call.quality_score)}
                        </div>
                        <p className="text-sm text-foreground">
                          Call with {call.contact_name || "Unknown"} — {formatDate(call.started_at)} — {formatDuration(call.duration_seconds)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {call.agents?.agent_name || "Unknown Agent"}
                        </p>
                        {/* Tags */}
                        {Array.isArray(call.coaching_tags) && call.coaching_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(call.coaching_tags as string[]).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">
                                {tagLabels[tag] || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Top improvement */}
                        {firstImprovement && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            ⚡ {firstImprovement}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {call.recording_url && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedCall(call)}>
                            <Play className="h-3 w-3 mr-1" />Listen
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedCall(call)}>
                          Review
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkReviewed(call.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Done
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleFlag(call.id)}>
                          <Flag className="h-3 w-3 mr-1" />Flag
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Excellent Examples */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Excellent Examples</CardTitle>
            <Badge variant="secondary" className="text-[10px] border-0">{excellentCalls?.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {exLoading ? (
            <Skeleton className="h-32" />
          ) : !excellentCalls?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No excellent calls yet — keep improving!</p>
          ) : (
            <div className="space-y-3">
              {excellentCalls.slice(0, 5).map((call: any) => {
                const feedback = call.score_feedback as any;
                const topStrength = feedback?.went_well?.[0];
                const highlights = call.coaching_highlights as any[];
                const bestMoment = highlights?.find((h: any) => h.type === "strength");
                return (
                  <div key={call.id} className="p-4 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors border border-emerald-500/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-emerald-600">{call.quality_score}</span>
                          <Badge className="bg-emerald-500/20 text-emerald-600 border-0">EXCELLENT ⭐</Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          Call with {call.contact_name || "Unknown"} — {formatDate(call.started_at)} — {formatDuration(call.duration_seconds)}
                        </p>
                        <p className="text-xs text-muted-foreground">{call.agents?.agent_name || "Unknown Agent"}</p>
                        {Array.isArray(call.coaching_tags) && call.coaching_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(call.coaching_tags as string[]).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                                {tagLabels[tag] || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {topStrength && (
                          <p className="text-xs text-muted-foreground mt-2 italic">✅ {topStrength}</p>
                        )}
                        {bestMoment && (
                          <div className="mt-2 p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-xs font-medium text-emerald-700">Best moment:</p>
                            <p className="text-xs text-muted-foreground italic">"{bestMoment.quote}"</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {call.recording_url && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedCall(call)}>
                            <Play className="h-3 w-3 mr-1" />Listen
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedCall(call)}>
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Flagged for Follow-Up */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            <CardTitle className="text-sm font-semibold">Flagged for Follow-Up</CardTitle>
            <Badge variant="secondary" className="text-[10px] border-0">{flaggedCalls?.length || 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {flLoading ? (
            <Skeleton className="h-20" />
          ) : !flaggedCalls?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No flagged calls.</p>
          ) : (
            <div className="space-y-3">
              {flaggedCalls.map((call: any) => {
                const latestNote = call.call_coaching_notes?.[0];
                return (
                  <div key={call.id} className="p-4 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors border border-destructive/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg font-bold ${scoreColor(call.quality_score || 0)}`}>{call.quality_score || "—"}</span>
                          {call.coaching_category && categoryBadge(call.coaching_category, call.quality_score || 0)}
                          <span className="text-xs text-muted-foreground">🚩 Flagged</span>
                        </div>
                        <p className="text-sm text-foreground">
                          Call with {call.contact_name || "Unknown"} — {formatDate(call.started_at)}
                        </p>
                        {latestNote && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{latestNote.note}" — {latestNote.author_email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate("/call-logs")}>
                          Review
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleResolveFlag(call.id)}>
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Distribution + Top Tags */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Score Distribution — Last 30 Days</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {distribution ? (
              <>
                <DistBar label="Excellent (90-100)" count={distribution.excellent.count} pct={distribution.excellent.pct} color="bg-emerald-500" total={distribution.total} />
                <DistBar label="Good (75-89)" count={distribution.good.count} pct={distribution.good.pct} color="bg-blue-500" total={distribution.total} />
                <DistBar label="Needs Improvement (60-74)" count={distribution.needs_improvement.count} pct={distribution.needs_improvement.pct} color="bg-amber-500" total={distribution.total} />
                <DistBar label="Poor (<60)" count={distribution.poor.count} pct={distribution.poor.pct} color="bg-destructive" total={distribution.total} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No scored calls yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Coaching Tags */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Most Common Patterns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topTags && topTags.length > 0 ? (
              topTags.map(({ tag, count }) => {
                const maxCount = topTags[0].count;
                const isPositive = tag.startsWith("great_") || tag === "successful_booking" || tag === "callback_secured" || tag === "dnc_handled_well";
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 truncate">{tagLabels[tag] || tag}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.max(10, (count / maxCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No patterns detected yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DistBar({ label, count, pct, color, total }: { label: string; count: number; pct: number; color: string; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">{count} calls ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

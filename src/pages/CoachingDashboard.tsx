import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCallsForCoaching, useCoachingStats } from "@/hooks/use-coaching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, AlertTriangle, CheckCircle2, Clock, MessageSquare, Play } from "lucide-react";

const statusLabels: Record<string, string> = {
  not_reviewed: "Not Reviewed",
  reviewed: "Reviewed",
  flagged_for_training: "Flagged for Training",
  needs_improvement: "Needs Improvement",
  excellent_example: "Excellent Example",
};

const statusIcons: Record<string, { icon: React.ElementType; color: string }> = {
  excellent_example: { icon: Star, color: "text-amber-500" },
  needs_improvement: { icon: AlertTriangle, color: "text-destructive" },
  flagged_for_training: { icon: MessageSquare, color: "text-blue-500" },
  reviewed: { icon: CheckCircle2, color: "text-success" },
  not_reviewed: { icon: Clock, color: "text-muted-foreground" },
};

export default function CoachingDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const { data: stats, isLoading: statsLoading } = useCoachingStats();
  const { data: calls, isLoading: callsLoading } = useCallsForCoaching({ review_status: filter });

  function formatDate(dt: string) {
    return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Call Coaching</h1>
        <p className="text-sm text-muted-foreground mt-1">Review calls, flag training examples, and track quality improvements.</p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("not_reviewed")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Needs Review</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.not_reviewed}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("flagged_for_training")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Flagged for Training</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.flagged_for_training}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("excellent_example")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Excellent Examples</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.excellent_example}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("needs_improvement")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Needs Improvement</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.needs_improvement}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviewed</SelectItem>
            <SelectItem value="not_reviewed">Not Reviewed</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="flagged_for_training">Flagged for Training</SelectItem>
            <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
            <SelectItem value="excellent_example">Excellent Examples</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls List */}
      {callsLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !calls || calls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No calls match this filter. Review calls from the Call Logs page to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Group by status */}
          {["excellent_example", "needs_improvement", "flagged_for_training", "reviewed", "not_reviewed"]
            .filter(status => filter === "all" ? calls.some((c: any) => c.review_status === status) : status === filter || filter === "not_reviewed")
            .map(status => {
              const group = calls.filter((c: any) => filter === "all" ? c.review_status === status : true);
              if (group.length === 0) return null;
              const info = statusIcons[status];
              const Icon = info?.icon || Clock;

              return (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${info?.color || ""}`} />
                      <CardTitle className="text-sm font-semibold">{statusLabels[status] || status}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] border-0">{group.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.map((call: any) => {
                      const latestNote = call.call_coaching_notes?.[0];
                      return (
                        <div key={call.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                          <div className="flex-1 min-w-0">
                            {latestNote && (
                              <p className="text-sm text-foreground mb-1 italic">"{latestNote.note}"</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {call.agents?.agent_name || "Unknown Agent"} • Call with {call.contact_name || "Unknown"} • {formatDate(call.started_at)}
                              {latestNote && ` — ${latestNote.author_email}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            {call.recording_url && (
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Play className="h-3 w-3 mr-1" />Listen
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate("/call-logs")}>
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

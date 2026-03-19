import { useState, useMemo } from "react";
import { useCalls } from "@/hooks/use-calls";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Download, Play, Search, ArrowUpRight, ArrowDownLeft, Phone, Flame, Thermometer, Snowflake } from "lucide-react";
import CallDetailPanel, { type CallWithRelations } from "@/components/calls/CallDetailPanel";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useDelayedLoading } from "@/hooks/use-delayed-loading";
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

export default function CallLogs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<CallWithRelations | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const { data: calls, isLoading, isError, refetch } = useCalls({ outcome: outcomeFilter, direction: directionFilter, search, limit: 200 });
  const showSkeleton = useDelayedLoading(isLoading);

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

  const hasFilters = search || outcomeFilter !== "all" || directionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setOutcomeFilter("all");
    setDirectionFilter("all");
    setPage(0);
  };

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Call Logs</h1>
        <TableSkeleton rows={10} cols={8} />
      </div>
    );
  }

  if (isError) return <ErrorState message="We couldn't load your call logs." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 animate-fade-in">
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
        hasFilters ? (
          <EmptyState
            icon={Search}
            title="No calls match your filters"
            description="Try adjusting your date range, outcome, or search term."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon={Phone}
            title="No calls yet"
            description="Once your agents start making calls, they'll appear here with full transcripts and analytics."
            actionLabel="Create an Agent"
            onAction={() => navigate("/agents/new")}
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {["", "Date / Time", "Contact", "Agent", "Duration", "Outcome", "Score", "Review", ""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((call: any, i: number) => {
                    const isLive = call.outcome === "in_progress";
                    return (
                    <tr key={call.id} className={`border-t hover:bg-secondary/20 cursor-pointer transition-colors ${isLive ? "bg-red-50/50 dark:bg-red-950/20" : i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedCall(call)}>
                      <td className="px-4 py-3">
                        {isLive ? (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                          </span>
                        ) : call.direction === "inbound"
                          ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                          : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {isLive && <span className="text-[10px] font-bold text-red-500 mr-1.5">LIVE</span>}
                        {formatDate(call.started_at)}
                      </td>
                      <td className="px-4 py-3"><p className="text-sm font-medium text-foreground">{call.contact_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{call.to_number}</p></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{call.agents?.agent_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{isLive ? <span className="text-red-500 text-xs font-medium">In Progress</span> : formatDuration(call.duration_seconds)}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className={`${outcomeColors[call.outcome] || "bg-secondary"} border-0 text-[10px]`}>{isLive ? "🔴 Live" : call.outcome.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Flame className="h-3 w-3" /> Scoring…
                          </span>
                        ) : call.quality_score != null ? (
                          <span className={`text-sm font-semibold ${call.quality_score >= 80 ? "text-success" : call.quality_score >= 60 ? "text-warning" : "text-destructive"}`}>
                            {call.quality_score}/100
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`${reviewStatusColors[call.review_status || "not_reviewed"] || "bg-secondary"} border-0 text-[10px]`}>
                          {reviewStatusOptions.find(o => o.value === (call.review_status || "not_reviewed"))?.label || "Not Reviewed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{call.recording_url && <button className="p-1 rounded hover:bg-secondary" aria-label="Play recording"><Play className="h-4 w-4 text-muted-foreground" /></button>}</td>
                    </tr>
                    );
                  })}
                      <td className="px-4 py-3">
                        {call.quality_score != null ? (
                          <span className={`text-sm font-semibold ${call.quality_score >= 80 ? "text-success" : call.quality_score >= 60 ? "text-warning" : "text-destructive"}`}>
                            {call.quality_score}/100
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`${reviewStatusColors[call.review_status || "not_reviewed"] || "bg-secondary"} border-0 text-[10px]`}>
                          {reviewStatusOptions.find(o => o.value === (call.review_status || "not_reviewed"))?.label || "Not Reviewed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{call.recording_url && <button className="p-1 rounded hover:bg-secondary" aria-label="Play recording"><Play className="h-4 w-4 text-muted-foreground" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-auto">
          {selectedCall && <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

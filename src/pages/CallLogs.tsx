import { useState, useMemo } from "react";
import { useCalls } from "@/hooks/use-calls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Flag, Play, Search, SkipBack, SkipForward, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

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
  agents: { agent_name: string } | null;
  campaigns: { name: string } | null;
};

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
                  {["", "Date / Time", "Contact", "Campaign", "Agent", "Duration", "Cost", "Outcome", "Sentiment", ""].map(h => (
                    <th key={h || "actions"} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((call: CallWithRelations, i: number) => (
                  <tr key={call.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedCall(call)}>
                    <td className="px-4 py-3">
                      {call.direction === "inbound"
                        ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                        : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(call.started_at)}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-foreground">{call.contact_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{call.to_number}</p></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{call.campaigns?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{call.agents?.agent_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{call.cost_with_margin ? `$${Number(call.cost_with_margin).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={`${outcomeColors[call.outcome] || "bg-secondary"} border-0 text-[10px]`}>{call.outcome.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-3">{call.sentiment && <span className={`h-2.5 w-2.5 rounded-full inline-block ${sentimentColors[call.sentiment] || ""}`} />}</td>
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
          {selectedCall && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{selectedCall.contact_name || "Unknown Contact"}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`${outcomeColors[selectedCall.outcome] || ""} border-0 text-[10px]`}>{selectedCall.outcome.replace("_", " ")}</Badge>
                  {selectedCall.sentiment && <span className={`h-2 w-2 rounded-full ${sentimentColors[selectedCall.sentiment]}`} />}
                  <span className="text-xs text-muted-foreground">{formatDate(selectedCall.started_at)} • {formatDuration(selectedCall.duration_seconds)}</span>
                </div>
              </SheetHeader>

              {/* Recording Player */}
              {selectedCall.recording_url && (
                <div className="bg-secondary/30 rounded-lg p-4">
                  <audio controls className="w-full" src={selectedCall.recording_url} />
                </div>
              )}

              {/* Summary */}
              {selectedCall.summary && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="section-label mb-2">AI-Generated Summary</p>
                  <p className="text-sm text-foreground">{selectedCall.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && Array.isArray(selectedCall.transcript) && (selectedCall.transcript as Array<{role: string; text: string; timestamp: number}>).length > 0 && (
                <div>
                  <p className="section-label mb-3">Full Transcript</p>
                  <div className="space-y-3">
                    {(selectedCall.transcript as Array<{role: string; text: string; timestamp: number}>).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === "assistant" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                          <p>{msg.text}</p>
                          {msg.timestamp > 0 && <p className="text-[10px] text-muted-foreground mt-1">{Math.floor(msg.timestamp / 60)}:{String(Math.floor(msg.timestamp % 60)).padStart(2, "0")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Data */}
              {selectedCall.extracted_data && Object.keys(selectedCall.extracted_data as Record<string, unknown>).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Detected Data Points</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(selectedCall.extracted_data as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* No data state */}
              {!selectedCall.summary && !selectedCall.transcript && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Detailed call data will appear here once the call ends and is processed.</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

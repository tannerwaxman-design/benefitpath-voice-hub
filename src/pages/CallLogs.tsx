import { useState, useMemo } from "react";
import { calls, sampleTranscript } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Flag, Play, Search, SkipBack, SkipForward } from "lucide-react";

const outcomeColors: Record<string, string> = {
  Connected: "bg-success/10 text-success",
  Voicemail: "bg-blue-50 text-blue-600",
  "No Answer": "bg-warning/10 text-warning",
  Transferred: "bg-purple-50 text-purple-600",
  Callback: "bg-pink-50 text-pink-600",
  Failed: "bg-destructive/10 text-destructive",
};

const sentimentColors: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-warning",
  negative: "bg-destructive",
};

export default function CallLogs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<typeof calls[0] | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 10;

  // ============================================
  // TODO: VAPI INTEGRATION
  // Endpoint: GET /call
  // Purpose: Fetch call list with filters and pagination
  // Docs: https://docs.vapi.ai/api-reference/calls/list
  // ============================================

  const filtered = useMemo(() => {
    let result = [...calls];
    if (search) result = result.filter(c => c.contactName.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
    if (outcomeFilter !== "All") result = result.filter(c => c.outcome === outcomeFilter);
    return result;
  }, [search, outcomeFilter]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function formatDuration(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function formatDate(dt: string) {
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Call Logs</h1>
        <Button variant="outline" onClick={() => toast({ title: "Exporting CSV..." })}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Connected", "Voicemail", "No Answer", "Transferred", "Callback", "Failed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["Date / Time", "Contact", "Campaign", "Agent", "Duration", "Outcome", "Sentiment", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((call, i) => (
                <tr key={call.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedCall(call)}>
                  <td className="px-4 py-3 text-sm text-foreground">{formatDate(call.dateTime)}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-foreground">{call.contactName}</p><p className="text-xs text-muted-foreground">{call.phone}</p></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{call.campaignName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{call.agentName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(call.duration)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={`${outcomeColors[call.outcome]} border-0 text-[10px]`}>{call.outcome}</Badge></td>
                  <td className="px-4 py-3"><span className={`h-2.5 w-2.5 rounded-full inline-block ${sentimentColors[call.sentiment]}`} /></td>
                  <td className="px-4 py-3"><button className="p-1 rounded hover:bg-secondary" onClick={e => { e.stopPropagation(); setSelectedCall(call); }}><Play className="h-4 w-4 text-muted-foreground" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">Showing {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Detail Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-auto">
          {selectedCall && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{selectedCall.contactName}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`${outcomeColors[selectedCall.outcome]} border-0 text-[10px]`}>{selectedCall.outcome}</Badge>
                  <span className={`h-2 w-2 rounded-full ${sentimentColors[selectedCall.sentiment]}`} />
                  <span className="text-xs text-muted-foreground">{formatDate(selectedCall.dateTime)} • {formatDuration(selectedCall.duration)}</span>
                </div>
              </SheetHeader>

              {/* Audio Player Mock */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="h-8 bg-secondary rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-primary/30 rounded-full" style={{ width: "35%" }} />
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button className="p-2 rounded-full hover:bg-secondary"><SkipBack className="h-4 w-4" /></button>
                  <button className="p-3 rounded-full bg-primary text-primary-foreground hover:opacity-90"><Play className="h-5 w-5" /></button>
                  <button className="p-2 rounded-full hover:bg-secondary"><SkipForward className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="section-label mb-2">AI-Generated Summary</p>
                <p className="text-sm text-foreground">Sarah connected with {selectedCall.contactName} regarding upcoming benefits enrollment. The contact expressed interest in updating their coverage. An appointment was scheduled for a follow-up consultation with a benefits advisor.</p>
              </div>

              {/* Transcript */}
              <div>
                <p className="section-label mb-3">Full Transcript</p>
                <div className="space-y-3">
                  {sampleTranscript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.speaker === "agent" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.speaker === "agent" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                        <p>{msg.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Data */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Detected Data Points</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Intent:</span><span className="text-foreground">Schedule appointment ✓</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Appointment:</span><span className="text-foreground">Feb 12, 2026 2:00 PM</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="text-foreground">john.martinez@email.com</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Dependents:</span><span className="text-foreground">2 (spouse + child)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Follow-up:</span><span className="text-foreground">Send plan comparison PDF</span></div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Flagged for review" })}><Flag className="h-4 w-4 mr-1" /> Flag</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Note added" })}>Add Note</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

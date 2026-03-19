import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Thermometer, LayoutGrid, List, Search, Phone, Calendar, ArrowRight, Flame, Snowflake, XCircle } from "lucide-react";
import { useLeads, useLeadStats, useLeadCalls, type LeadContact } from "@/hooks/use-leads";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

const statusConfig = {
  hot: { label: "Hot", icon: Flame, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", emoji: "🔥", badgeCls: "bg-red-500/15 text-red-600 border-red-500/30" },
  warm: { label: "Warm", icon: Thermometer, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", emoji: "🟡", badgeCls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  cold: { label: "Cold", icon: Snowflake, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", emoji: "🔵", badgeCls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  dead: { label: "Dead", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50 border-muted-foreground/20", emoji: "⛔", badgeCls: "bg-muted text-muted-foreground border-muted-foreground/30" },
};

function LeadCard({ lead, onClick }: { lead: LeadContact; onClick: () => void }) {
  const cfg = statusConfig[(lead.lead_status as keyof typeof statusConfig) || "cold"];
  return (
    <button onClick={onClick} className={`w-full text-left rounded-lg border p-3 transition-all hover:shadow-md hover:scale-[1.01] ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-foreground truncate">{lead.first_name} {lead.last_name}</span>
        <span className={`text-xs font-bold ${cfg.color}`}>{lead.lead_score}</span>
      </div>
      {lead.lead_summary && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lead.lead_summary}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Phone className="h-3 w-3" />
        <span>{lead.total_calls} call{lead.total_calls !== 1 ? "s" : ""}</span>
        {lead.last_called_at && (
          <span>· {formatDistanceToNow(new Date(lead.last_called_at), { addSuffix: true })}</span>
        )}
      </div>
    </button>
  );
}

function LeadDetailPanel({ lead, onClose }: { lead: LeadContact; onClose: () => void }) {
  const { data: calls, isLoading } = useLeadCalls(lead.id);
  const cfg = statusConfig[(lead.lead_status as keyof typeof statusConfig) || "cold"];

  return (
    <div className="space-y-6 pt-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-foreground">{lead.first_name} {lead.last_name}</h2>
          <Badge variant="outline" className={cfg.badgeCls}>{cfg.emoji} {cfg.label}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {lead.phone && <span>{lead.phone}</span>}
          {lead.email && <span>{lead.email}</span>}
          {lead.company && <span>{lead.company}</span>}
        </div>
      </div>

      {/* Score */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Lead Score</span>
            <span className={`text-2xl font-bold ${cfg.color}`}>{lead.lead_score}/100</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${lead.lead_status === "hot" ? "bg-red-500" : lead.lead_status === "warm" ? "bg-amber-500" : lead.lead_status === "cold" ? "bg-blue-500" : "bg-muted-foreground"}`} style={{ width: `${lead.lead_score || 0}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      {lead.lead_summary && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">AI Analysis</h3>
            <p className="text-sm text-muted-foreground">{lead.lead_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Recommended Action */}
      {lead.recommended_action && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
              <ArrowRight className="h-4 w-4 text-primary" /> Next Action
            </h3>
            <p className="text-sm text-muted-foreground">{lead.recommended_action}</p>
          </CardContent>
        </Card>
      )}

      {/* Call History */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Call History</h3>
        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : calls && calls.length > 0 ? (
          <div className="space-y-2">
            {calls.map((call: any) => (
              <div key={call.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-foreground">{format(new Date(call.started_at), "MMM d, h:mm a")}</span>
                  <Badge variant="outline" className="text-xs">{call.outcome}</Badge>
                </div>
                {call.summary && <p className="text-xs text-muted-foreground line-clamp-2">{call.summary}</p>}
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  {call.duration_seconds && <span>{Math.round(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, "0")}</span>}
                  {call.quality_score && <span>Score: {call.quality_score}</span>}
                  {call.agents?.agent_name && <span>Agent: {call.agents.agent_name}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No calls recorded yet.</p>
        )}
      </div>
    </div>
  );
}

export default function Leads() {
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadContact | null>(null);
  const { data: leads, isLoading } = useLeads();
  const { data: stats } = useLeadStats();

  const filtered = useMemo(() => {
    if (!leads) return [];
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email || "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  const columns = useMemo(() => ({
    hot: filtered.filter(l => l.lead_status === "hot"),
    warm: filtered.filter(l => l.lead_status === "warm"),
    cold: filtered.filter(l => l.lead_status === "cold"),
    dead: filtered.filter(l => l.lead_status === "dead"),
  }), [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-primary" /> Lead Temperature
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-analyzed lead quality from every call conversation.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[220px]" />
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant={view === "board" ? "default" : "ghost"} size="sm" onClick={() => setView("board")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(["hot", "warm", "cold", "dead"] as const).map(status => {
          const cfg = statusConfig[status];
          return (
            <Card key={status} className={`${cfg.bg} border`}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.emoji} {cfg.label}</p>
                  <p className={`text-2xl font-bold ${cfg.color}`}>{stats?.[status] ?? 0}</p>
                </div>
                <cfg.icon className={`h-8 w-8 ${cfg.color} opacity-40`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Board View */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-64" />)}</div>
      ) : view === "board" ? (
        <div className="grid grid-cols-4 gap-4 items-start">
          {(["hot", "warm", "cold", "dead"] as const).map(status => {
            const cfg = statusConfig[status];
            const items = columns[status];
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
                  )}
                  {items.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Called</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No scored leads yet. Leads are scored automatically after AI calls.</TableCell></TableRow>
              ) : filtered.map(lead => {
                const cfg = statusConfig[(lead.lead_status as keyof typeof statusConfig) || "cold"];
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                    <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                    <TableCell><span className={`font-bold ${cfg.color}`}>{lead.lead_score}</span></TableCell>
                    <TableCell><Badge variant="outline" className={cfg.badgeCls}>{cfg.emoji} {cfg.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{lead.last_called_at ? formatDistanceToNow(new Date(lead.last_called_at), { addSuffix: true }) : "—"}</TableCell>
                    <TableCell>{lead.total_calls}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{lead.recommended_action || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Panel */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="w-[480px] sm:w-[540px] overflow-auto">
          {selectedLead && <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

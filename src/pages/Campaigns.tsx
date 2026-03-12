import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaigns, useLaunchCampaign } from "@/hooks/use-campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, Plus, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  draft: "bg-secondary text-muted-foreground",
  completed: "bg-blue-50 text-blue-600",
  scheduled: "bg-purple-50 text-purple-600",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns();
  const launchCampaign = useLaunchCampaign();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = campaigns || [];
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    return result;
  }, [campaigns, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Campaigns</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Campaigns</h1>
        <Button onClick={() => navigate("/campaigns/new")}><Plus className="h-4 w-4 mr-2" /> Create Campaign</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "active", "paused", "draft", "completed", "scheduled"].map(s => (
              <SelectItem key={s} value={s}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first campaign to start reaching contacts.</p>
            <Button onClick={() => navigate("/campaigns/new")}><Plus className="h-4 w-4 mr-2" /> Create Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {["Campaign Name", "Agent", "Status", "Contacts", "Connected", "Appointments", "Conversion", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={`border-t hover:bg-secondary/20 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(c as any).agents?.agent_name || "—"}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className={`${statusColors[c.status] || ""} border-0 text-[10px]`}>{c.status}</Badge></td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{c.contacts_called} / {c.total_contacts}</span>
                        {c.total_contacts > 0 && (
                          <div className="w-20 bg-secondary rounded-full h-1 mt-1">
                            <div className="bg-primary h-1 rounded-full" style={{ width: `${(c.contacts_called / c.total_contacts) * 100}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.contacts_connected}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.appointments_set}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${(c.conversion_rate || 0) > 10 ? "text-success" : (c.conversion_rate || 0) > 5 ? "text-warning" : "text-destructive"}`}>
                          {(c.conversion_rate || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary"><MoreVertical className="h-4 w-4 text-muted-foreground" /></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {c.status === "draft" && (
                              <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "start" })}>
                                {launchCampaign.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Launch
                              </DropdownMenuItem>
                            )}
                            {c.status === "active" && (
                              <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "pause" })}>Pause</DropdownMenuItem>
                            )}
                            {c.status === "paused" && (
                              <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "resume" })}>Resume</DropdownMenuItem>
                            )}
                            {["active", "paused"].includes(c.status) && (
                              <DropdownMenuItem className="text-destructive" onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "cancel" })}>Cancel</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

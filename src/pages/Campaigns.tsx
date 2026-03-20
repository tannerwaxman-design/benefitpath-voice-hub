import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaigns, useLaunchCampaign } from "@/hooks/use-campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { CampaignSuggestions } from "@/components/campaigns/CampaignSuggestions";

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
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useCampaigns();
  const launchCampaign = useLaunchCampaign();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = campaigns || [];
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    return result;
  }, [campaigns, search, statusFilter]);

  const handleDelete = async (id: string) => {
    setOperationLoading(id);
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) { toast.error("Failed to delete campaign"); return; }
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setOperationLoading(id);
    try {
      const { error } = await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", id);
      if (error) { toast.error("Failed to cancel campaign"); return; }
      toast.success("Campaign cancelled");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    const original = campaigns?.find(c => c.id === id);
    if (!original) return;
    setOperationLoading(id);
    try {
      const { id: _id, created_at, updated_at, actual_start, actual_end, status, contacts_called, contacts_connected, contacts_no_answer, contacts_voicemail, contacts_failed, contacts_callback, contacts_transferred, appointments_set, conversion_rate, total_minutes_used, avg_call_duration_seconds, ...rest } = original as any;
      const { error } = await supabase.from("campaigns").insert({ ...rest, name: `${original.name} (Copy)`, status: "draft" });
      if (error) { toast.error("Failed to duplicate"); return; }
      toast.success("Campaign duplicated as draft");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleExport = async (id: string) => {
    setOperationLoading(id);
    try {
      const { data } = await supabase
        .from("campaign_contacts")
        .select("*, contacts(first_name, last_name, phone, email, company)")
        .eq("campaign_id", id);
      if (!data?.length) { toast.info("No contacts to export"); return; }
      const headers = ["First Name", "Last Name", "Phone", "Email", "Company", "Status", "Attempts", "Last Outcome", "Sentiment"];
      const rows = data.map((cc: any) => [
        cc.contacts?.first_name, cc.contacts?.last_name, cc.contacts?.phone,
        cc.contacts?.email, cc.contacts?.company, cc.status, cc.total_attempts,
        cc.last_outcome, cc.sentiment
      ]);
      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v || ""}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `campaign-results-${id}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } finally {
      setOperationLoading(null);
    }
  };

  const onConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "delete") handleDelete(confirmAction.id);
    else if (confirmAction.action === "cancel") handleCancel(confirmAction.id);
    setConfirmAction(null);
  };

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

      {/* Enrollment-based campaign suggestions */}
      <CampaignSuggestions />

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
                    <tr key={c.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 === 0 ? "" : "bg-secondary/10"}`} onClick={() => navigate(`/campaigns/${c.id}`)}>
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
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {operationLoading === c.id ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* DRAFT */}
                            {c.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}/edit`)}>✏️ Edit Campaign</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "start" })}>
                                  🚀 Launch Campaign
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>📋 Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ id: c.id, action: "delete" })}>
                                  🗑️ Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* ACTIVE */}
                            {c.status === "active" && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}`)}>👁️ View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "pause" })}>⏸️ Pause Campaign</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>📋 Duplicate</DropdownMenuItem>
                              </>
                            )}
                            {/* PAUSED */}
                            {c.status === "paused" && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}`)}>👁️ View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => launchCampaign.mutate({ campaign_id: c.id, action: "resume" })}>▶️ Resume Campaign</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}/edit`)}>✏️ Edit Campaign</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>📋 Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ id: c.id, action: "cancel" })}>
                                  ❌ Cancel Campaign
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* COMPLETED */}
                            {c.status === "completed" && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}`)}>👁️ View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>📋 Duplicate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport(c.id)}>📥 Export Results</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ id: c.id, action: "delete" })}>
                                  🗑️ Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* CANCELLED / SCHEDULED fallback */}
                            {["cancelled", "scheduled"].includes(c.status) && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/campaigns/${c.id}`)}>👁️ View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(c.id)}>📋 Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ id: c.id, action: "delete" })}>
                                  🗑️ Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "delete" ? "Delete Campaign" : "Cancel Campaign"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "delete"
                ? "This will permanently delete this campaign and its data. This cannot be undone."
                : "This will cancel the campaign. No further calls will be made. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {confirmAction?.action === "delete" ? "Delete" : "Cancel Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
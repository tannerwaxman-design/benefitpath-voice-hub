import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaignDetail, useCampaignContacts, useCampaignCalls, useCampaignDailyStats, useCampaignRealtime } from "@/hooks/use-campaign-detail";
import { useLaunchCampaign } from "@/hooks/use-campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Pause, Play, Settings, Phone, Users, BarChart3,
  ArrowUpRight, ArrowDownLeft, Clock, CalendarCheck, TrendingUp, XCircle,
} from "lucide-react";
import CallDetailPanel, { type CallWithRelations } from "@/components/calls/CallDetailPanel";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  draft: "bg-secondary text-muted-foreground",
  completed: "bg-blue-50 text-blue-600",
  scheduled: "bg-purple-50 text-purple-600",
  cancelled: "bg-destructive/10 text-destructive",
};

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

const contactStatusColors: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  in_progress: "bg-blue-50 text-blue-600",
  completed: "bg-success/10 text-success",
  no_answer: "bg-warning/10 text-warning",
  voicemail: "bg-purple-50 text-purple-600",
  failed: "bg-destructive/10 text-destructive",
  dnc: "bg-destructive/10 text-destructive",
  callback: "bg-amber-50 text-amber-600",
};

function formatDate(dt: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(s: number | null) {
  if (!s) return "0:00";
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function formatShortDuration(s: number | null) {
  if (!s) return "0:00";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── CALL ACTIVITY TAB ──
function CallActivityTab({ campaignId }: { campaignId: string }) {
  const { data: calls, isLoading } = useCampaignCalls(campaignId);
  const [selectedCall, setSelectedCall] = useState<CallWithRelations | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!calls || calls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No calls recorded yet for this campaign.</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["Contact", "Date/Time", "Duration", "Outcome", "Sentiment", "Score"].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call: any, i: number) => (
                <tr
                  key={call.id}
                  className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`}
                  onClick={() => setSelectedCall(call)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{call.contact_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{call.to_number}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{formatDate(call.started_at)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatShortDuration(call.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={`${outcomeColors[call.outcome] || "bg-secondary"} border-0 text-[10px]`}>
                      {call.outcome.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {call.sentiment ? (
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        call.sentiment === "positive" ? "bg-success" :
                        call.sentiment === "negative" ? "bg-destructive" : "bg-warning"
                      }`} />
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {call.quality_score != null ? (
                      <span className={`text-sm font-semibold ${
                        call.quality_score >= 80 ? "text-success" :
                        call.quality_score >= 60 ? "text-warning" : "text-destructive"
                      }`}>{call.quality_score}</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-auto">
          {selectedCall && <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── CONTACTS TAB ──
function ContactsTab({ campaignId }: { campaignId: string }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: contacts, isLoading } = useCampaignContacts(campaignId, statusFilter);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              { value: "all", label: "All Contacts" },
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "no_answer", label: "No Answer" },
              { value: "voicemail", label: "Voicemail" },
              { value: "failed", label: "Failed" },
              { value: "callback", label: "Callback" },
            ].map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{contacts?.length || 0} contacts</span>
      </div>

      {!contacts || contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No contacts found with this filter.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["Name", "Phone", "Status", "Attempts", "Last Called", "Next Call", "Outcome"].map(h => (
                    <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((cc: any, i: number) => {
                  const contact = cc.contacts;
                  const name = contact ? `${contact.first_name} ${contact.last_name}` : "Unknown";
                  const phone = contact?.phone || "—";
                  // Mask phone middle digits
                  const maskedPhone = phone.length > 6
                    ? phone.slice(0, phone.length - 4).replace(/\d(?=\d{0,2}$)/g, "•") + phone.slice(-4)
                    : phone;

                  return (
                    <tr key={cc.id} className={`border-t ${i % 2 ? "bg-secondary/10" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        {contact?.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{maskedPhone}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`${contactStatusColors[cc.status] || "bg-secondary"} border-0 text-[10px]`}>
                          {cc.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{cc.total_attempts}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(cc.last_attempt_at)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(cc.next_attempt_at)}</td>
                      <td className="px-4 py-3">
                        {cc.last_outcome ? (
                          <Badge variant="secondary" className={`${outcomeColors[cc.last_outcome] || "bg-secondary"} border-0 text-[10px]`}>
                            {cc.last_outcome.replace("_", " ")}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── PERFORMANCE TAB ──
function PerformanceTab({ campaignId, campaign }: { campaignId: string; campaign: any }) {
  const { data: stats, isLoading } = useCampaignDailyStats(campaignId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const daily = stats?.daily || [];
  const outcomes = stats?.outcomes || {};
  const totalCalls = stats?.totalCalls || 0;

  const maxDayTotal = Math.max(...daily.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Connect rate over time */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Call Volume & Connect Rate</CardTitle></CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No daily data yet.</p>
          ) : (
            <div className="space-y-2">
              {daily.map(d => {
                const connectRate = d.total > 0 ? ((d.connected / d.total) * 100).toFixed(0) : "0";
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-5 bg-secondary/30 rounded overflow-hidden relative">
                        <div
                          className="h-full bg-primary/20 rounded"
                          style={{ width: `${(d.total / maxDayTotal) * 100}%` }}
                        />
                        <div
                          className="h-full bg-primary rounded absolute top-0 left-0"
                          style={{ width: `${(d.connected / maxDayTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-16 text-right">
                        {d.connected}/{d.total}
                      </span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{connectRate}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-2">
                <span className="w-20" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary" /> Connected</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary/20" /> Total Calls</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outcome Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Outcome Breakdown</CardTitle></CardHeader>
        <CardContent>
          {totalCalls === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No outcome data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(outcomes)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([outcome, count]) => {
                  const pct = ((count as number) / totalCalls * 100).toFixed(1);
                  return (
                    <div key={outcome} className="flex items-center gap-3">
                      <Badge variant="secondary" className={`${outcomeColors[outcome] || "bg-secondary"} border-0 text-[10px] w-24 justify-center`}>
                        {outcome.replace("_", " ")}
                      </Badge>
                      <div className="flex-1">
                        <Progress value={parseFloat(pct)} className="h-2" />
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{count as number}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign vs Agent Averages */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Campaign Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalCalls > 0 ? ((outcomes["connected"] || 0 + (outcomes["completed"] || 0)) / totalCalls * 100).toFixed(1) : "0"}%
              </p>
              <p className="text-xs text-muted-foreground">Connect Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{campaign?.appointments_set || 0}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {campaign?.avg_call_duration_seconds ? formatDuration(campaign.avg_call_duration_seconds) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── SETTINGS TAB ──
function SettingsTab({ campaign }: { campaign: any }) {
  const navigate = useNavigate();

  const callingDays = Array.isArray(campaign.calling_days)
    ? campaign.calling_days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")
    : "Mon–Fri";

  return (
    <div className="space-y-6">
      {/* Agent & Objective */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Agent & Objective</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Agent:</span><span className="text-foreground font-medium">{campaign.agents?.agent_name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Objective:</span><span className="text-foreground">{campaign.objective?.replace("_", " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Priority:</span><span className="text-foreground">{campaign.priority}</span></div>
        </CardContent>
      </Card>

      {/* Schedule & Pacing */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Schedule & Pacing</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Calling Window:</span><span className="text-foreground">{campaign.calling_window_start} – {campaign.calling_window_end}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Calling Days:</span><span className="text-foreground">{callingDays}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Max Calls/Day:</span><span className="text-foreground">{campaign.max_calls_per_day}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Max Concurrent:</span><span className="text-foreground">{campaign.max_concurrent_calls}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Timezone Strategy:</span><span className="text-foreground">{campaign.timezone_strategy?.replace("_", " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Smart Schedule:</span><span className="text-foreground">{campaign.smart_schedule_enabled ? "Enabled" : "Disabled"}</span></div>
        </CardContent>
      </Card>

      {/* Retry Logic */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Retry Logic</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">No Answer:</span>
            <span className="text-foreground">
              {campaign.retry_no_answer ? `Retry ${campaign.retry_no_answer_max}x after ${campaign.retry_no_answer_after_hours}h` : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voicemail:</span>
            <span className="text-foreground">
              {campaign.retry_voicemail ? `Retry ${campaign.retry_voicemail_max}x after ${campaign.retry_voicemail_after_hours}h` : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Busy:</span>
            <span className="text-foreground">
              {campaign.retry_busy ? `Retry ${campaign.retry_busy_max}x after ${campaign.retry_busy_after_minutes}min` : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Dates */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Scheduled Start:</span><span className="text-foreground">{formatDate(campaign.scheduled_start)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Scheduled End:</span><span className="text-foreground">{formatDate(campaign.scheduled_end)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Actual Start:</span><span className="text-foreground">{formatDate(campaign.actual_start)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Actual End:</span><span className="text-foreground">{formatDate(campaign.actual_end)}</span></div>
          {campaign.estimated_days_to_complete && (
            <div className="flex justify-between"><span className="text-muted-foreground">Est. Days to Complete:</span><span className="text-foreground">{campaign.estimated_days_to_complete}</span></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── MAIN PAGE ──
export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaignDetail(id);
  const launchCampaign = useLaunchCampaign();
  useCampaignRealtime(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/campaigns")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = campaign.total_contacts > 0
    ? (campaign.contacts_called / campaign.total_contacts) * 100
    : 0;
  const connectRate = campaign.contacts_called > 0
    ? ((campaign.contacts_connected / campaign.contacts_called) * 100).toFixed(1)
    : "0.0";
  const conversionRate = campaign.contacts_connected > 0
    ? ((campaign.appointments_set / campaign.contacts_connected) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
            <Badge variant="secondary" className={`${statusColors[campaign.status] || ""} border-0`}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Agent: <span className="text-foreground font-medium">{(campaign as any).agents?.agent_name || "—"}</span></span>
            <span>Contacts: <span className="text-foreground font-medium">{campaign.total_contacts}</span></span>
            {campaign.actual_start && (
              <span>Started: <span className="text-foreground font-medium">{formatDate(campaign.actual_start)}</span></span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => launchCampaign.mutate({ campaign_id: campaign.id, action: "pause" })}>
              <Pause className="h-4 w-4 mr-1.5" /> Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button variant="outline" size="sm" onClick={() => launchCampaign.mutate({ campaign_id: campaign.id, action: "resume" })}>
              <Play className="h-4 w-4 mr-1.5" /> Resume
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button size="sm" onClick={() => launchCampaign.mutate({ campaign_id: campaign.id, action: "start" })}>
              <Play className="h-4 w-4 mr-1.5" /> Launch
            </Button>
          )}
          {["active", "paused"].includes(campaign.status) && (
            <Button variant="destructive" size="sm" onClick={() => launchCampaign.mutate({ campaign_id: campaign.id, action: "cancel" })}>
              <XCircle className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Contacted</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{campaign.contacts_called} <span className="text-sm text-muted-foreground font-normal">/ {campaign.total_contacts}</span></p>
            <Progress value={progressPct} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPct.toFixed(1)}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{campaign.contacts_connected}</p>
            <p className="text-xs text-muted-foreground mt-1">Connect rate: {connectRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Appointments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{campaign.appointments_set}</p>
            <p className="text-xs text-muted-foreground mt-1">Conversion: {conversionRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {campaign.avg_call_duration_seconds
                ? formatDuration(campaign.avg_call_duration_seconds)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {campaign.total_minutes_used ? `${Number(campaign.total_minutes_used).toFixed(1)} min used` : "No usage yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls" className="gap-1.5"><Phone className="h-3.5 w-3.5" /> Call Activity</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Performance</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calls">
          <CallActivityTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab campaignId={campaign.id} campaign={campaign} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab campaign={campaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

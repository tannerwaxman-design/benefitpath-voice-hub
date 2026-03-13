import { PhoneOutgoing, PhoneCall, Clock, CalendarCheck, ArrowUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useRecentCalls } from "@/hooks/use-calls";
import { useAnalyticsSummary, useCallsPerDay } from "@/hooks/use-analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo, useCallback, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { subDays, format } from "date-fns";

const OUTCOME_COLORS: Record<string, string> = {
  connected: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  voicemail: "bg-blue-50 text-blue-600",
  no_answer: "bg-warning/10 text-warning",
  transferred: "bg-purple-50 text-purple-600",
  busy: "bg-pink-50 text-pink-600",
  failed: "bg-destructive/10 text-destructive",
  in_progress: "bg-blue-50 text-blue-600",
};

const sentimentDot: Record<string, string> = {
  positive: "bg-success",
  neutral: "bg-warning",
  negative: "bg-destructive",
};

export default function Overview() {
  const { user } = useAuth();
  const [chartRange, setChartRange] = useState(30);
  const [queryNow, setQueryNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setQueryNow(new Date()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dateFrom = useMemo(() => subDays(queryNow, chartRange).toISOString(), [queryNow, chartRange]);
  const dateTo = useMemo(() => queryNow.toISOString(), [queryNow]);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useAnalyticsSummary(dateFrom, dateTo);
  const { data: callsPerDay, refetch: refetchChart } = useCallsPerDay(dateFrom, dateTo);
  const { data: campaigns, refetch: refetchCampaigns } = useCampaigns();
  const { data: recentCalls, refetch: refetchCalls } = useRecentCalls(8);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setQueryNow(new Date());
    try {
      await Promise.all([refetchSummary(), refetchChart(), refetchCampaigns(), refetchCalls()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSummary, refetchChart, refetchCampaigns, refetchCalls]);

  const activeCampaigns = useMemo(() => {
    return (campaigns || []).filter(c => c.status === "active" || c.status === "paused").slice(0, 4);
  }, [campaigns]);

  const chartData = useMemo(() => {
    return (callsPerDay || []).map((d: any) => ({
      date: d.day,
      calls: Number(d.total_calls),
    }));
  }, [callsPerDay]);

  const pieData = useMemo(() => {
    if (!summary) return [];
    const total = Number(summary.total_calls) || 1;
    // Approximate from connect rate
    const connected = Math.round(total * (Number(summary.connect_rate) || 0) / 100);
    const remaining = total - connected;
    return [
      { name: "Connected", value: connected, color: "#10B981" },
      { name: "Other", value: remaining, color: "#F59E0B" },
    ];
  }, [summary]);

  const statCards = [
    { label: "Total Calls Made", value: summary ? Number(summary.total_calls).toLocaleString() : "—", sub: `Last ${chartRange} days`, icon: PhoneOutgoing, accent: "stat-card-accent-indigo", iconBg: "bg-primary/10 text-primary" },
    { label: "Connect Rate", value: summary ? `${Number(summary.connect_rate || 0).toFixed(1)}%` : "—", sub: "Connected / total", icon: PhoneCall, accent: "stat-card-accent-green", iconBg: "bg-success/10 text-success" },
    { label: "Avg Call Duration", value: summary ? `${Math.floor(Number(summary.avg_duration_seconds || 0) / 60)}m ${Math.round(Number(summary.avg_duration_seconds || 0) % 60)}s` : "—", sub: "Average per call", icon: Clock, accent: "stat-card-accent-amber", iconBg: "bg-warning/10 text-warning" },
    { label: "Appointments Set", value: summary ? Number(summary.appointments_set).toLocaleString() : "—", sub: summary ? `${Number(summary.conversion_rate || 0).toFixed(1)}% conversion` : "—", icon: CalendarCheck, accent: "stat-card-accent-purple", iconBg: "bg-purple-100 text-purple-600" },
  ];

  function timeAgo(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function formatDuration(s: number | null) {
    if (!s) return "0:00";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Overview</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`stat-card ${card.accent}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {summaryLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>}
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div className={`p-2.5 rounded-full ${card.iconBg}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="card-title">Call Volume — Last {chartRange} Days</CardTitle>
            <div className="flex gap-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setChartRange(d)}
                  className={`px-3 py-1 text-xs rounded-full ${chartRange === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                >{d} Days</button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5) || ""} interval={Math.max(1, Math.floor(chartData.length / 6))} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#4F46E5" fill="url(#callGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No call data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="card-title">Call Outcomes</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 && Number(summary?.total_calls) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-foreground">{Number(summary?.total_calls || 0)}</text>
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns + Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="card-title">Active Campaigns</CardTitle>
            <a href="/campaigns" className="text-xs text-primary hover:underline">View All</a>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active campaigns</p>
            ) : activeCampaigns.map(c => (
              <div key={c.id} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className={c.status === "active" ? "bg-success/10 text-success border-0 text-[10px]" : "bg-warning/10 text-warning border-0 text-[10px]"}>
                      {c.status}
                    </Badge>
                  </div>
                  {c.total_contacts > 0 && (
                    <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(c.contacts_called / c.total_contacts) * 100}%` }} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{c.contacts_called} / {c.total_contacts} contacted • {c.appointments_set} appointments</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="card-title">Recent Calls</CardTitle>
            <a href="/call-logs" className="text-xs text-primary hover:underline">View All</a>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!recentCalls || recentCalls.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No calls yet</p>
            ) : recentCalls.map(call => (
              <div key={call.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{call.contact_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{call.to_number}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs text-muted-foreground">{timeAgo(call.started_at)}</span>
                  <Badge variant="secondary" className={`${OUTCOME_COLORS[call.outcome] || ""} border-0 text-[10px]`}>{call.outcome.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground w-10">{formatDuration(call.duration_seconds)}</span>
                  {call.sentiment && <span className={`h-2 w-2 rounded-full ${sentimentDot[call.sentiment] || ""}`} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Minutes Usage */}
      {user?.tenant && (
        <Card>
          <CardHeader><CardTitle className="card-title">Minutes Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">{user.tenant.minutes_used_this_cycle.toLocaleString()} / {user.tenant.monthly_minute_limit.toLocaleString()} minutes</span>
                  <span className="text-sm text-muted-foreground">{((user.tenant.minutes_used_this_cycle / user.tenant.monthly_minute_limit) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (user.tenant.minutes_used_this_cycle / user.tenant.monthly_minute_limit) * 100)}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Download, Zap } from "lucide-react";
import { useSmartSchedule, groupSlotsByScore, DAY_NAMES, formatSlotTime } from "@/hooks/use-smart-schedule";
import {
  ComposedChart, Bar, Line,
  BarChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [callsPerDay, setCallsPerDay] = useState<any[]>([]);
  const [agentPerf, setAgentPerf] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const { data: smartSlots } = useSmartSchedule();

  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange));
    return d.toISOString();
  }, [dateRange]);
  const dateTo = useMemo(() => new Date().toISOString(), [dateRange]);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const [summaryRes, dailyRes, agentRes, funnelRes, tenantRes] = await Promise.all([
        supabase.rpc("get_analytics_summary", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_calls_per_day", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_agent_performance", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_conversion_funnel", { date_from: dateFrom, date_to: dateTo }),
        supabase.from("tenants").select("minutes_used_this_cycle, monthly_minute_limit").single(),
      ]);

      if (summaryRes.data) setSummary(Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data);
      if (dailyRes.data) setCallsPerDay(dailyRes.data);
      if (agentRes.data) setAgentPerf(agentRes.data);
      if (funnelRes.data) setFunnel(Array.isArray(funnelRes.data) ? funnelRes.data[0] : funnelRes.data);
      if (tenantRes.data) setTenant(tenantRes.data);
      setLoading(false);
    }
    fetchAnalytics();
  }, [dateFrom, dateTo]);

  const kpis = summary ? [
    { label: "Total Calls", value: (summary.total_calls || 0).toLocaleString() },
    { label: "Connect Rate", value: `${summary.connect_rate || 0}%` },
    { label: "Avg Duration", value: formatDuration(summary.avg_duration_seconds) },
    { label: "Appointments Set", value: (summary.appointments_set || 0).toLocaleString() },
    { label: "Conversion Rate", value: `${summary.conversion_rate || 0}%` },
  ] : [];

  const funnelData = funnel ? [
    { name: "Total Calls", value: funnel.total_calls || 0, fill: "hsl(var(--primary))" },
    { name: "Connected", value: funnel.connected || 0, fill: "hsl(var(--primary) / 0.8)" },
    { name: "Engaged (>1 min)", value: funnel.engaged || 0, fill: "hsl(var(--primary) / 0.6)" },
    { name: "Qualified", value: funnel.qualified || 0, fill: "hsl(var(--primary) / 0.4)" },
    { name: "Appointment Set", value: funnel.appointments || 0, fill: "hsl(var(--success))" },
  ] : [];

  const volumeData = callsPerDay.map((d: any) => ({
    date: d.day,
    calls: Number(d.total_calls),
    connected: Number(d.connected),
    connectRate: d.total_calls > 0 ? Math.round((Number(d.connected) / Number(d.total_calls)) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Analytics</h1>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast({ title: "Report exported!" })}><Download className="h-4 w-4 mr-2" /> Export</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-6 w-16" /></CardContent></Card>
        )) : kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Volume + Connect Rate */}
      <Card>
        <CardHeader><CardTitle className="card-title">Call Volume & Connect Rate</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px] w-full" /> : volumeData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No call data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5) || ""} interval={Math.max(0, Math.floor(volumeData.length / 8))} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="calls" fill="hsl(var(--primary) / 0.3)" radius={[2, 2, 0, 0]} name="Total Calls" />
                <Line yAxisId="right" dataKey="connectRate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Connect Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader><CardTitle className="card-title">Agent Performance Comparison</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <Skeleton className="h-40 w-full m-4" /> : agentPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active agents</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["Agent", "Calls", "Connect Rate", "Avg Duration", "Appointments", "Sentiment", "Avg Score"].map(h => (
                    <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentPerf.map((a: any) => (
                  <tr key={a.agent_id} className="border-t">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{a.agent_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{Number(a.total_calls).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.connect_rate != null ? `${a.connect_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(a.avg_duration)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{Number(a.appointments).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.positive_sentiment_pct != null ? `${a.positive_sentiment_pct}% pos` : "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {a.avg_score != null ? (
                        <span className={`font-semibold ${
                          a.avg_score >= 80 ? "text-success" :
                          a.avg_score >= 60 ? "text-warning" : "text-destructive"
                        }`}>{Math.round(a.avg_score)}/100</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader><CardTitle className="card-title">Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : !funnel || funnel.total_calls === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-2">
              {funnelData.map((stage, i) => {
                const pct = funnelData[0].value > 0 ? ((stage.value / funnelData[0].value) * 100).toFixed(1) : "0";
                const dropoff = i > 0 && funnelData[i - 1].value > 0 ? ((1 - stage.value / funnelData[i - 1].value) * 100).toFixed(1) : null;
                return (
                  <div key={stage.name} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-foreground text-right">{stage.name}</div>
                    <div className="flex-1 relative">
                      <div className="h-10 rounded-md flex items-center px-4" style={{ width: `${Math.max(Number(pct), 5)}%`, backgroundColor: stage.fill, minWidth: 80 }}>
                        <span className="text-xs font-medium text-primary-foreground">{stage.value.toLocaleString()} ({pct}%)</span>
                      </div>
                    </div>
                    {dropoff && <span className="text-xs text-destructive w-16">-{dropoff}%</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

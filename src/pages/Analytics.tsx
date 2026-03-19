import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Zap, BarChart3, Lightbulb } from "lucide-react";
import { useSmartSchedule, DAY_NAMES, formatSlotTime } from "@/hooks/use-smart-schedule";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AnalyticsSkeleton } from "@/components/ui/page-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useCountUp } from "@/hooks/use-count-up";
import { useDelayedLoading } from "@/hooks/use-delayed-loading";
import { useNavigate } from "react-router-dom";

const ScriptInsights = lazy(() => import("@/components/analytics/ScriptInsights"));

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AnimatedKpi({ value, suffix = "" }: { value: number; suffix?: string }) {
  const animated = useCountUp(value);
  return <>{animated.toLocaleString()}{suffix}</>;
}

export default function Analytics() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [callsPerDay, setCallsPerDay] = useState<any[]>([]);
  const [agentPerf, setAgentPerf] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const { data: smartSlots } = useSmartSchedule();

  const showSkeleton = useDelayedLoading(loading);

  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(dateRange));
    return d.toISOString();
  }, [dateRange]);
  const dateTo = useMemo(() => new Date().toISOString(), [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(false);
    try {
      const [summaryRes, dailyRes, agentRes, funnelRes] = await Promise.all([
        supabase.rpc("get_analytics_summary", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_calls_per_day", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_agent_performance", { date_from: dateFrom, date_to: dateTo }),
        supabase.rpc("get_conversion_funnel", { date_from: dateFrom, date_to: dateTo }),
      ]);

      if (summaryRes.data) setSummary(Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data);
      if (dailyRes.data) setCallsPerDay(dailyRes.data);
      if (agentRes.data) setAgentPerf(agentRes.data);
      if (funnelRes.data) setFunnel(Array.isArray(funnelRes.data) ? funnelRes.data[0] : funnelRes.data);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [dateFrom, dateTo]);

  if (showSkeleton) return <AnalyticsSkeleton />;
  if (error) return <ErrorState message="We couldn't load analytics data." onRetry={fetchAnalytics} />;

  const totalCalls = Number(summary?.total_calls || 0);

  if (!loading && totalCalls === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Analytics</h1>
        </div>
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Analytics will populate after your agents make some calls. Start a campaign to get going."
          actionLabel="Go to Campaigns"
          onAction={() => navigate("/campaigns")}
        />
      </div>
    );
  }

  const kpis = summary ? [
    { label: "Total Calls", value: totalCalls, render: <AnimatedKpi value={totalCalls} /> },
    { label: "Connect Rate", value: Number(summary.connect_rate || 0), render: <>{summary.connect_rate || 0}%</> },
    { label: "Avg Duration", value: 0, render: <>{formatDuration(summary.avg_duration_seconds)}</> },
    { label: "Appointments Set", value: Number(summary.appointments_set || 0), render: <AnimatedKpi value={Number(summary.appointments_set || 0)} /> },
    { label: "Conversion Rate", value: 0, render: <>{summary.conversion_rate || 0}%</> },
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
    <div className="space-y-6 animate-fade-in">
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="script-insights" className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" /> Script Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpis.map(kpi => (
              <Card key={kpi.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.render}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Volume + Connect Rate */}
          <Card>
            <CardHeader><CardTitle className="card-title">Call Volume & Connect Rate</CardTitle></CardHeader>
            <CardContent>
              {volumeData.length === 0 ? (
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
              {agentPerf.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active agents</p>
              ) : (
                <div className="overflow-x-auto">
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
                        <tr key={a.agent_id} className="border-t hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{a.agent_name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{Number(a.total_calls).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{a.connect_rate != null ? `${a.connect_rate}%` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDuration(a.avg_duration)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{Number(a.appointments).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{a.positive_sentiment_pct != null ? `${a.positive_sentiment_pct}% pos` : "—"}</td>
                          <td className="px-4 py-3 text-sm">
                            {a.avg_score != null ? (
                              <span className={`font-semibold ${a.avg_score >= 80 ? "text-success" : a.avg_score >= 60 ? "text-warning" : "text-destructive"}`}>{Math.round(a.avg_score)}/100</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Schedule Heatmap */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="card-title">Best Times to Call</CardTitle>
                {smartSlots && smartSlots.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Smart Schedule is optimizing your campaigns based on this data</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!smartSlots || smartSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Not enough call data to generate schedule recommendations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left text-muted-foreground">Hour</th>
                        {DAY_NAMES.map(d => <th key={d} className="px-2 py-1 text-center text-muted-foreground">{d.slice(0, 3)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => i + 7).map(hour => (
                        <tr key={hour}>
                          <td className="px-2 py-1 text-muted-foreground">{formatSlotTime(hour)}</td>
                          {Array.from({ length: 7 }, (_, day) => {
                            const slot = smartSlots.find(s => s.day_of_week === day && s.hour_of_day === hour);
                            const bg = slot
                              ? slot.score === "best" ? "bg-success/30 text-success"
                                : slot.score === "good" ? "bg-warning/20 text-warning"
                                : slot.score === "avoid" ? "bg-destructive/20 text-destructive"
                                : "bg-secondary text-muted-foreground"
                              : "bg-secondary/30 text-muted-foreground";
                            return (
                              <td key={day} className="px-1 py-1 text-center">
                                <div className={`rounded px-1 py-0.5 ${bg}`}>
                                  {slot ? `${slot.connect_rate}%` : "—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30" /> Best</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Good</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary" /> Average</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20" /> Avoid</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader><CardTitle className="card-title">Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              {!funnel || funnel.total_calls === 0 ? (
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
                          <div className="h-10 rounded-md flex items-center px-4 transition-all duration-500" style={{ width: `${Math.max(Number(pct), 5)}%`, backgroundColor: stage.fill, minWidth: 80 }}>
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
        </TabsContent>

        <TabsContent value="script-insights" className="mt-4">
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>}>
            <ScriptInsights />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

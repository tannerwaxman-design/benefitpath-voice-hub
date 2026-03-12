import { PhoneOutgoing, PhoneCall, Clock, CalendarCheck, ArrowUp, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { campaigns, calls, callOutcomeData, generateCallVolumeData } from "@/data/mockData";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const statCards = [
  { label: "Total Calls Made", value: "12,847", sub: "+1,243 this week", icon: PhoneOutgoing, accent: "stat-card-accent-indigo", iconBg: "bg-primary/10 text-primary" },
  { label: "Connect Rate", value: "68.4%", sub: "+2.1% vs last week", icon: PhoneCall, accent: "stat-card-accent-green", iconBg: "bg-success/10 text-success" },
  { label: "Avg Call Duration", value: "3m 24s", sub: "Target: 4m 00s", icon: Clock, accent: "stat-card-accent-amber", iconBg: "bg-warning/10 text-warning" },
  { label: "Appointments Set", value: "1,847", sub: "14.4% conversion rate", icon: CalendarCheck, accent: "stat-card-accent-purple", iconBg: "bg-purple-100 text-purple-600" },
];

export default function Overview() {
  const [chartRange, setChartRange] = useState(30);
  const chartData = generateCallVolumeData(chartRange);
  const activeCampaigns = campaigns.filter(c => c.status === "Active" || c.status === "Paused").slice(0, 4);
  const recentCalls = calls.slice(0, 8);

  const outcomeColors: Record<string, string> = {
    Connected: "bg-success/10 text-success",
    Voicemail: "bg-blue-50 text-blue-600",
    "No Answer": "bg-warning/10 text-warning",
    Transferred: "bg-purple-50 text-purple-600",
    Callback: "bg-pink-50 text-pink-600",
    Failed: "bg-destructive/10 text-destructive",
  };

  function timeAgo(dt: string) {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function formatDuration(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`stat-card ${card.accent}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {card.sub.includes("+") && <ArrowUp className="h-3 w-3 text-success" />}
                  {card.sub}
                </p>
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
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="calls" stroke="#4F46E5" fill="url(#callGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="card-title">Call Outcomes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={callOutcomeData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {callOutcomeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-foreground">12,847</text>
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
            {activeCampaigns.map(c => (
              <div key={c.id} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    <Badge variant={c.status === "Active" ? "default" : "secondary"} className={c.status === "Active" ? "bg-success/10 text-success border-0 text-[10px]" : "bg-warning/10 text-warning border-0 text-[10px]"}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(c.contactsCalled / c.contactsTotal) * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.contactsCalled} / {c.contactsTotal} contacted • {c.appointments} appointments</p>
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
            {recentCalls.map(call => (
              <div key={call.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{call.contactName}</p>
                  <p className="text-xs text-muted-foreground">{call.phone}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs text-muted-foreground">{timeAgo(call.dateTime)}</span>
                  <Badge variant="secondary" className={`${outcomeColors[call.outcome]} border-0 text-[10px]`}>{call.outcome}</Badge>
                  <span className="text-xs text-muted-foreground w-10">{formatDuration(call.duration)}</span>
                  {call.outcome === "Connected" && (
                    <span className={`h-2 w-2 rounded-full ${call.sentiment === "positive" ? "bg-success" : call.sentiment === "neutral" ? "bg-warning" : "bg-destructive"}`} />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader><CardTitle className="card-title">AI Agent Performance Insights</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="section-label mb-2">Top Performing Agent</p>
              <p className="text-base font-semibold text-foreground">Sarah — Benefits Specialist</p>
              <p className="text-sm text-muted-foreground mt-1">73.2% success rate • 4,892 calls</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="section-label mb-2">Most Common Objection</p>
              <p className="text-base font-semibold text-foreground">"Already have coverage"</p>
              <p className="text-sm text-muted-foreground mt-1">Detected 342 times this month</p>
              <button className="text-xs text-primary mt-2 hover:underline">View objection handling →</button>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <p className="section-label mb-2">Recommended Action</p>
              <p className="text-sm text-foreground">Your Tuesday 10am-12pm slot has 23% higher connect rates. Consider scheduling more campaigns during this window.</p>
              <button className="mt-2 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">Adjust Schedule</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

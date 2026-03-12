import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateCallVolumeData, callOutcomeData, generateHeatmapData } from "@/data/mockData";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, Funnel, FunnelChart, LabelList,
} from "recharts";

const kpis = [
  { label: "Total Calls", value: "12,847", change: "+18.2%", up: true },
  { label: "Connect Rate", value: "68.4%", change: "+2.1%", up: true },
  { label: "Avg Duration", value: "3m 24s", change: "+12s", up: true },
  { label: "Appointments Set", value: "1,847", change: "+24.3%", up: true },
  { label: "Conversion Rate", value: "14.4%", change: "+1.8%", up: true },
  { label: "Minutes Used", value: "4,328", change: "43.3% used", up: true },
];

const volumeData = generateCallVolumeData(30).map((d, i) => ({
  ...d,
  connectRate: 60 + Math.random() * 20,
}));

const sentimentData = [
  { agent: "Sarah", positive: 72, neutral: 20, negative: 8 },
  { agent: "James", positive: 65, neutral: 25, negative: 10 },
];

const objectionData = [
  { name: "Not interested", count: 342 },
  { name: "Already have coverage", count: 289 },
  { name: "Too busy", count: 234 },
  { name: "Call back later", count: 198 },
  { name: "Is this a scam?", count: 87 },
  { name: "Want to speak to human", count: 76 },
];

const funnelData = [
  { name: "Total Calls", value: 12847, fill: "#4F46E5" },
  { name: "Connected", value: 8787, fill: "#6366F1" },
  { name: "Engaged (>1 min)", value: 6234, fill: "#818CF8" },
  { name: "Qualified", value: 3892, fill: "#A5B4FC" },
  { name: "Appointment Set", value: 1847, fill: "#10B981" },
  { name: "Showed Up (est.)", value: 1293, fill: "#34D399" },
];

const agentPerformance = [
  { agent: "Sarah", calls: 4892, connectRate: "71.2%", avgDuration: "3:48", appointments: 892, conversion: "18.2%", sentiment: "72% pos" },
  { agent: "James", calls: 2341, connectRate: "64.8%", avgDuration: "3:12", appointments: 412, conversion: "17.6%", sentiment: "65% pos" },
  { agent: "Maria", calls: 0, connectRate: "—", avgDuration: "—", appointments: 0, conversion: "—", sentiment: "—" },
];

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");

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
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className={`text-xs flex items-center gap-1 mt-1 ${kpi.up ? "text-success" : "text-destructive"}`}>
                {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {kpi.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Volume + Connect Rate */}
      <Card>
        <CardHeader><CardTitle className="card-title">Call Volume & Connect Rate</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} interval={4} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="calls" fill="#C7D2FE" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" dataKey="connectRate" stroke="#10B981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment + Objections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="card-title">Sentiment by Agent</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sentimentData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="agent" tick={{ fontSize: 12 }} width={60} />
                <Tooltip />
                <Bar dataKey="positive" stackId="a" fill="#10B981" />
                <Bar dataKey="neutral" stackId="a" fill="#F59E0B" />
                <Bar dataKey="negative" stackId="a" fill="#EF4444" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="card-title">Top Objections</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={objectionData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader><CardTitle className="card-title">Agent Performance Comparison</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["Agent", "Calls", "Connect Rate", "Avg Duration", "Appointments", "Conversion", "Sentiment"].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map(a => (
                <tr key={a.agent} className="border-t">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{a.agent}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.calls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.connectRate}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.avgDuration}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.appointments}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.conversion}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.sentiment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader><CardTitle className="card-title">Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const pct = ((stage.value / funnelData[0].value) * 100).toFixed(1);
              const dropoff = i > 0 ? ((1 - stage.value / funnelData[i - 1].value) * 100).toFixed(1) : null;
              return (
                <div key={stage.name} className="flex items-center gap-4">
                  <div className="w-40 text-sm text-foreground text-right">{stage.name}</div>
                  <div className="flex-1 relative">
                    <div className="h-10 rounded-md flex items-center px-4" style={{ width: `${pct}%`, backgroundColor: stage.fill, minWidth: 80 }}>
                      <span className="text-xs font-medium text-white">{stage.value.toLocaleString()} ({pct}%)</span>
                    </div>
                  </div>
                  {dropoff && <span className="text-xs text-destructive w-16">-{dropoff}%</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

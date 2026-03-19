import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SoaStats {
  total_connected: number;
  soa_collected: number;
  soa_consent_given: number;
  soa_consent_declined: number;
  soa_not_collected: number;
}

export default function SoaComplianceReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SoaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.tenant_id) return;
    const fetchStats = async () => {
      setLoading(true);
      // Get calls with SOA-enabled agents
      const { data, error } = await supabase
        .from("calls")
        .select("id, contact_name, to_number, started_at, outcome, soa_collected, soa_consent_given, soa_timestamp_seconds, soa_plan_types, soa_response_text, agents!inner(agent_name, soa_enabled)")
        .gte("started_at", dateFrom)
        .lte("started_at", dateTo)
        .in("outcome", ["connected", "completed"]);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // Filter to only SOA-enabled agent calls
      const soaCalls = (data || []).filter((c) => c.agents?.soa_enabled);
      setCalls(soaCalls);

      const collected = soaCalls.filter((c) => c.soa_collected);
      const given = collected.filter((c) => c.soa_consent_given === true);
      const declined = collected.filter((c) => c.soa_consent_given === false);
      const notCollected = soaCalls.filter((c) => !c.soa_collected);

      setStats({
        total_connected: soaCalls.length,
        soa_collected: collected.length,
        soa_consent_given: given.length,
        soa_consent_declined: declined.length,
        soa_not_collected: notCollected.length,
      });
      setLoading(false);
    };
    fetchStats();
  }, [user?.tenant_id, dateFrom, dateTo]);

  const exportCsv = () => {
    if (!calls.length) return;
    const header = "Call Date,Contact Name,Phone Number,SOA Collected,Consent Given,Timestamp (s),Plan Types,Agent Name\n";
    const rows = calls.map((c) => {
      const planTypes = c.soa_plan_types ? (c.soa_plan_types as string[]).join("; ") : "";
      return [
        new Date(c.started_at).toISOString(),
        c.contact_name || "",
        c.to_number,
        c.soa_collected ? "Yes" : "No",
        c.soa_consent_given === true ? "Yes" : c.soa_consent_given === false ? "No" : "",
        c.soa_timestamp_seconds ?? "",
        `"${planTypes}"`,
        c.agents?.agent_name || "",
      ].join(",");
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soa-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "SOA report exported" });
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading SOA data...</div>;

  if (!stats || stats.total_connected === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No calls with SOA-enabled agents in this period.</p>
          <p className="text-xs text-muted-foreground mt-1">Enable SOA in an agent's Compliance settings to start tracking.</p>
        </CardContent>
      </Card>
    );
  }

  const collectedPct = ((stats.soa_collected / stats.total_connected) * 100).toFixed(1);
  const givenPct = stats.soa_collected > 0 ? ((stats.soa_consent_given / stats.soa_collected) * 100).toFixed(1) : "0.0";
  const declinedPct = stats.soa_collected > 0 ? ((stats.soa_consent_declined / stats.soa_collected) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">SOA Compliance Report</h3>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Connected</p>
            <p className="text-xl font-bold text-foreground">{stats.total_connected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">SOA Collected</p>
            <p className="text-xl font-bold text-foreground">{stats.soa_collected} <span className="text-sm font-normal text-muted-foreground">({collectedPct}%)</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Consent Given</p>
            <p className="text-xl font-bold text-success">{stats.soa_consent_given} <span className="text-sm font-normal text-muted-foreground">({givenPct}%)</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Consent Declined</p>
            <p className="text-xl font-bold text-warning">{stats.soa_consent_declined} <span className="text-sm font-normal text-muted-foreground">({declinedPct}%)</span></p>
          </CardContent>
        </Card>
      </div>

      {stats.soa_not_collected > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            {stats.soa_not_collected} call{stats.soa_not_collected !== 1 ? "s" : ""} did not have SOA collected. Review these for compliance issues.
          </p>
        </div>
      )}

      {/* Recent calls table */}
      <Card>
        <CardHeader><CardTitle className="card-title text-xs">Recent SOA Calls</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Contact</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Agent</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">SOA Status</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {calls.slice(0, 20).map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-1.5 px-2">{new Date(c.started_at).toLocaleDateString()}</td>
                    <td className="py-1.5 px-2">{c.contact_name || c.to_number}</td>
                    <td className="py-1.5 px-2">{c.agents?.agent_name || "—"}</td>
                    <td className="py-1.5 px-2">
                      {c.soa_collected ? (
                        c.soa_consent_given ? (
                          <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">✅ Consent Given</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/10 text-warning border-0 text-[10px]">⚠️ Declined</Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-[10px]">❌ Not Collected</Badge>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground">
                      {c.soa_timestamp_seconds != null ? `${Math.floor(c.soa_timestamp_seconds / 60)}:${String(c.soa_timestamp_seconds % 60).padStart(2, "0")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

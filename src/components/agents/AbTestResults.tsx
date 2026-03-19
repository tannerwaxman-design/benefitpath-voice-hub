import { useAbTests, useAbTestResults, useEndAbTest, AbTest } from "@/hooks/use-ab-tests";
import { useUpdateAgent } from "@/hooks/use-agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Trophy, Loader2, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TestResultCard({ test }: { test: AbTest }) {
  const { data: results, isLoading } = useAbTestResults(test.id);
  const endTest = useEndAbTest();
  const updateAgent = useUpdateAgent();
  const [declaring, setDeclaring] = useState(false);

  if (isLoading || !results) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { version_a: a, version_b: b, confidence } = results;
  const totalCalls = a.calls + b.calls;

  const betterVersion = b.appointment_rate > a.appointment_rate ? "b" : a.appointment_rate > b.appointment_rate ? "a" : null;
  const improvement = betterVersion === "b"
    ? a.appointment_rate > 0 ? Math.round(((b.appointment_rate - a.appointment_rate) / a.appointment_rate) * 100) : 0
    : betterVersion === "a"
    ? b.appointment_rate > 0 ? Math.round(((a.appointment_rate - b.appointment_rate) / b.appointment_rate) * 100) : 0
    : 0;

  const handleDeclareWinner = async (winner: "a" | "b") => {
    setDeclaring(true);
    const winnerText = winner === "a" ? test.version_a_text : test.version_b_text;
    const fieldMap: Record<string, string> = { greeting: "greeting_script", closing: "closing_script", voicemail: "voicemail_script" };
    const agentField = fieldMap[test.field];
    if (agentField) {
      await updateAgent.mutateAsync({ agent_id: test.agent_id, [agentField]: winnerText });
    }
    endTest.mutate({ test_id: test.id, winner });
    setDeclaring(false);
  };

  const rows = [
    { label: "Calls", a: a.calls, b: b.calls },
    { label: "Connected", a: `${a.connected} (${a.connect_rate}%)`, b: `${b.connected} (${b.connect_rate}%)` },
    { label: "Avg Duration", a: formatDuration(a.avg_duration), b: formatDuration(b.avg_duration) },
    { label: "Appointments", a: `${a.appointments} (${a.appointment_rate}%)`, b: `${b.appointments} (${b.appointment_rate}%)`, highlight: true },
    { label: "Positive Sentiment", a: `${a.positive_sentiment_pct}%`, b: `${b.positive_sentiment_pct}%` },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">
              {test.field.charAt(0).toUpperCase() + test.field.slice(1)} Script Test
            </CardTitle>
            <Badge variant={test.status === "running" ? "default" : "secondary"} className="text-xs">
              {test.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalCalls} calls · {test.status === "running" ? `since ${format(new Date(test.started_at), "MMM d")}` : `ended ${format(new Date(test.ended_at!), "MMM d")}`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium" />
                <th className="text-center py-2 text-muted-foreground font-medium">Version A (Control)</th>
                <th className="text-center py-2 text-muted-foreground font-medium">Version B (Test)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-2 text-muted-foreground">{row.label}</td>
                  <td className={`py-2 text-center ${row.highlight && betterVersion === "a" ? "font-semibold text-success" : ""}`}>
                    {String(row.a)}{row.highlight && betterVersion === "a" ? " ← WINNER" : ""}
                  </td>
                  <td className={`py-2 text-center ${row.highlight && betterVersion === "b" ? "font-semibold text-success" : ""}`}>
                    {String(row.b)}{row.highlight && betterVersion === "b" ? " ← WINNER" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalCalls > 5 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Statistical confidence:</span>
            <Badge variant="outline" className={confidence >= 95 ? "text-success border-success/30" : confidence >= 80 ? "text-warning border-warning/30" : ""}>
              {confidence}%
            </Badge>
          </div>
        )}

        {betterVersion && improvement > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              Version {betterVersion.toUpperCase()} is performing better on appointments (+{improvement}%).
              {confidence < 95 && ` Need ~${Math.max(10, Math.round((95 - confidence) / 0.15))} more calls to reach 95% confidence.`}
            </p>
          </div>
        )}

        {test.status === "running" && (
          <div className="flex gap-2">
            {betterVersion && (
              <Button size="sm" className="gap-1" onClick={() => handleDeclareWinner(betterVersion)} disabled={declaring}>
                {declaring && <Loader2 className="h-3 w-3 animate-spin" />}
                <Trophy className="h-3.5 w-3.5" /> Declare Winner & Apply
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => endTest.mutate({ test_id: test.id })}>
              {!betterVersion ? "End Test" : "Keep Running"}
            </Button>
          </div>
        )}

        {test.winner && (
          <div className="text-sm text-success flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            Version {test.winner.toUpperCase()} was declared the winner and applied.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AbTestResultsPanel({ agentId }: { agentId: string }) {
  const { data: tests, isLoading } = useAbTests(agentId);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>;

  const activeTests = (tests || []).filter(t => t.status === "running");
  const pastTests = (tests || []).filter(t => t.status !== "running");

  if (!tests || tests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No A/B tests yet. Start one from any script field in the Agent Builder.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Active Tests</h3>
          {activeTests.map(t => <TestResultCard key={t.id} test={t} />)}
        </div>
      )}
      {pastTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Past Tests</h3>
          {pastTests.map(t => <TestResultCard key={t.id} test={t} />)}
        </div>
      )}
    </div>
  );
}

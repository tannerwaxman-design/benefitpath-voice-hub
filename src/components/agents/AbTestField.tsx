import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveAbTest, useCreateAbTest, useEndAbTest } from "@/hooks/use-ab-tests";
import { useUpdateAgent } from "@/hooks/use-agents";
import { FlaskConical, Loader2, X, Trophy } from "lucide-react";
import { format } from "date-fns";

interface AbTestFieldProps {
  agentId: string | undefined;
  field: string;
  label: string;
  currentValue: string;
  onValueChange: (value: string) => void;
}

export function AbTestField({ agentId, field, label, currentValue, onValueChange }: AbTestFieldProps) {
  const [showVersionB, setShowVersionB] = useState(false);
  const [versionBText, setVersionBText] = useState("");
  const [trafficSplit, setTrafficSplit] = useState("50");

  const { data: activeTest, isLoading } = useActiveAbTest(agentId, field);
  const createTest = useCreateAbTest();
  const endTest = useEndAbTest();
  const updateAgent = useUpdateAgent();

  if (isLoading) return null;

  const handleStartTest = () => {
    if (!agentId || agentId === "new" || !versionBText.trim()) return;
    createTest.mutate({
      agent_id: agentId,
      field,
      version_a_text: currentValue,
      version_b_text: versionBText,
      traffic_split: parseInt(trafficSplit),
    });
    setShowVersionB(false);
    setVersionBText("");
  };

  const handleDeclareWinner = async (winner: "a" | "b") => {
    if (!activeTest || !agentId) return;
    const winnerText = winner === "a" ? activeTest.version_a_text : activeTest.version_b_text;

    // Apply the winning text to the agent
    const fieldMap: Record<string, string> = {
      greeting: "greeting_script",
      closing: "closing_script",
      voicemail: "voicemail_script",
    };
    const agentField = fieldMap[field];
    if (agentField) {
      onValueChange(winnerText);
      updateAgent.mutate({ agent_id: agentId, [agentField]: winnerText });
    }

    endTest.mutate({ test_id: activeTest.id, winner });
  };

  const handleEndTest = () => {
    if (!activeTest) return;
    endTest.mutate({ test_id: activeTest.id });
  };

  // Active test UI
  if (activeTest) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 gap-1">
            <FlaskConical className="h-3 w-3" /> A/B Test Running
          </Badge>
        </div>

        <div className="grid gap-3">
          <div className="border border-border rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">A — Control ({100 - activeTest.traffic_split}%)</Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeTest.version_a_text}</p>
          </div>
          <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">B — Test ({activeTest.traffic_split}%)</Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeTest.version_b_text}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Running since {format(new Date(activeTest.started_at), "MMM d")}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleDeclareWinner("a")}>
              <Trophy className="h-3 w-3" /> Pick A
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleDeclareWinner("b")}>
              <Trophy className="h-3 w-3" /> Pick B
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={handleEndTest}>
              End Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No active test — show field with A/B toggle
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {agentId && agentId !== "new" && !showVersionB && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setShowVersionB(true)}>
            <FlaskConical className="h-3 w-3" /> A/B Test
          </Button>
        )}
      </div>

      <Textarea value={currentValue} onChange={e => onValueChange(e.target.value)} rows={3} />

      {showVersionB && (
        <div className="border border-dashed border-primary/40 rounded-lg p-3 space-y-3 bg-primary/5">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-primary">Version B (Test)</Label>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowVersionB(false); setVersionBText(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea value={versionBText} onChange={e => setVersionBText(e.target.value)} rows={3} placeholder="Enter alternative text to test..." />
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Traffic split:</Label>
            <Select value={trafficSplit} onValueChange={setTrafficSplit}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50/50</SelectItem>
                <SelectItem value="30">70/30</SelectItem>
                <SelectItem value="20">80/20</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleStartTest} disabled={createTest.isPending || !versionBText.trim()}>
              {createTest.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Start Test
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

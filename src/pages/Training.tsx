import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/use-agents";
import { useTrainingSessions, useRunSimulation } from "@/hooks/use-training";
import { GraduationCap, Target, Bot, ClipboardList, Play, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const SCENARIOS = [
  { value: "medicare_aep_reluctant", label: "Medicare AEP — Reluctant Lead", desc: '"I\'m not interested, I already have coverage"' },
  { value: "benefits_enrollment_busy", label: "Benefits Enrollment — Busy Professional", desc: '"I don\'t have time right now"' },
  { value: "policy_renewal_price", label: "Policy Renewal — Price Sensitive", desc: '"My current plan is cheaper"' },
  { value: "skeptical_caller", label: "General — Skeptical Caller", desc: '"Is this a scam? Are you a robot?"' },
  { value: "aggressive_objector", label: "General — Aggressive Objector", desc: '"Stop calling me! I said no!"' },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy", desc: "Lead is mildly hesitant but open" },
  { value: "medium", label: "Medium", desc: "Lead pushes back 2-3 times before engaging" },
  { value: "hard", label: "Hard", desc: "Very resistant, multiple strong objections" },
];

type View = "home" | "setup_test" | "running" | "result" | "history";

export default function Training() {
  const { data: agents } = useAgents();
  const { data: sessions, isLoading: sessionsLoading } = useTrainingSessions();
  const runSimulation = useRunSimulation();

  const [view, setView] = useState<View>("home");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [scenario, setScenario] = useState("medicare_aep_reluctant");
  const [difficulty, setDifficulty] = useState("medium");
  const [result, setResult] = useState<any>(null);

  const activeAgents = agents?.filter(a => a.status === "active" || a.status === "draft") || [];

  const handleRunSimulation = async () => {
    if (!selectedAgent) return;
    setView("running");
    setResult(null);
    try {
      const data = await runSimulation.mutateAsync({
        agent_id: selectedAgent,
        scenario,
        difficulty,
        mode: "test_agent",
      });
      setResult(data);
      setView("result");
    } catch {
      setView("setup_test");
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // HOME
  if (view === "home") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> AI Training Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Practice handling objections before going live. The AI plays the role of a tough lead and scores your responses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setView("setup_test")}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Test Your AI Agent</h3>
              <p className="text-sm text-muted-foreground">
                Let your AI agent handle a simulated call with objections. See how it performs.
              </p>
              <Button className="w-full">Run Simulation</Button>
            </CardContent>
          </Card>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="hover:border-primary/40 transition-colors opacity-60">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Practice Yourself</h3>
                  <p className="text-sm text-muted-foreground">
                    YOU handle the call. The AI acts as a difficult lead and scores your responses.
                  </p>
                  <Button variant="outline" className="w-full" disabled>Coming Soon</Button>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Practice mode is coming soon. You'll be able to role-play as the lead while the AI scores your responses.</p>
            </TooltipContent>
          </Tooltip>

          <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setView("history")}>
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">View Past Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Review previous training sessions and scores.
              </p>
              <Button variant="outline" className="w-full">View History</Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent sessions preview */}
        {sessions && sessions.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="card-title">Recent Training Sessions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {["Date", "Agent", "Scenario", "Difficulty", "Score", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 5).map(s => (
                    <tr key={s.id} className="border-t cursor-pointer hover:bg-secondary/30" onClick={() => { setResult(s); setView("result"); }}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{s.agents?.agent_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{SCENARIOS.find(sc => sc.value === s.scenario)?.label || s.scenario}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{s.difficulty}</Badge></td>
                      <td className="px-4 py-3 text-sm">
                        {s.score != null ? <span className={`font-semibold ${scoreColor(s.score)}`}>{s.score}/100</span> : "—"}
                      </td>
                      <td className="px-4 py-3"><Badge variant={s.status === "completed" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // SETUP TEST AGENT
  if (view === "setup_test") {
    return (
      <div className="space-y-6 max-w-xl">
        <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Training Center
        </button>
        <h2 className="text-xl font-bold text-foreground">AI Agent Simulation Setup</h2>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Your Agent *</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
                <SelectContent>
                  {activeAgents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.agent_name}{a.agent_title ? ` — ${a.agent_title}` : ""}</SelectItem>
                  ))}
                  {activeAgents.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No agents available.</div>}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Simulated Lead Scenario</Label>
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div>
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      <div>
                        <span>{d.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {d.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleRunSimulation} disabled={!selectedAgent} className="w-full">
              <Play className="h-4 w-4 mr-2" /> Run Simulation
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              The simulation takes about 30-60 seconds. You'll see the full transcript and score when it's done.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RUNNING
  if (view === "running") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Running Simulation...</h3>
            <p className="text-sm text-muted-foreground">
              Your AI agent is handling a simulated call. Two AIs are talking to each other right now.
            </p>
            <Progress value={60} className="w-full" />
            <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RESULT
  if (view === "result" && result) {
    const fb = result.feedback || {};
    const bd = result.score_breakdown || {};
    const transcript = result.transcript || [];

    const breakdownLabels: Record<string, string> = {
      opening_hook: "Opening & Hook",
      value_proposition: "Value Proposition",
      objection_handling: "Objection Handling",
      discovery_questions: "Discovery Questions",
      call_to_action: "Call-to-Action",
      professionalism: "Professionalism",
      compliance: "Compliance",
      outcome_achievement: "Outcome Achievement",
      conversation_flow: "Conversation Flow",
      overall_effectiveness: "Overall Effectiveness",
    };

    return (
      <div className="space-y-6 max-w-3xl">
        <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Training Center
        </button>

        {/* Score Card */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" /> Simulation Complete!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {SCENARIOS.find(s => s.value === (result.scenario || scenario))?.label || scenario}
                  {" · "}{result.difficulty || difficulty}
                  {result.duration_seconds ? ` · ${formatDuration(result.duration_seconds)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className={`text-4xl font-bold ${scoreColor(result.score || 0)}`}>{result.score || 0}<span className="text-lg text-muted-foreground">/100</span></p>
              </div>
            </div>

            <Progress value={result.score || 0} className="h-3" />

            {/* Strengths */}
            {fb.strengths?.length > 0 && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                <p className="text-sm font-medium text-success mb-2">✅ What went well</p>
                <ul className="text-sm text-foreground space-y-1">
                  {fb.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {fb.improvements?.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm font-medium text-warning mb-2">⚡ Areas to improve</p>
                <ul className="text-sm text-foreground space-y-1">
                  {fb.improvements.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {/* Suggested Script */}
            {fb.suggested_script && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-primary mb-2">💡 Suggested Script Improvement</p>
                <p className="text-sm text-foreground italic">"{fb.suggested_script}"</p>
              </div>
            )}

            {/* Score Breakdown */}
            {Object.keys(bd).length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">📊 Score Breakdown</p>
                <div className="space-y-2">
                  {Object.entries(breakdownLabels).map(([key, label]) => {
                    const val = bd[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-44">{label}</span>
                        <Progress value={val * 10} className="flex-1 h-2" />
                        <span className={`text-sm font-medium w-10 text-right ${val >= 8 ? "text-success" : val >= 6 ? "text-warning" : "text-destructive"}`}>{val}/10</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setView("setup_test")}>Practice Again</Button>
              <Button variant="outline" onClick={() => setView("home")}>Back to Training</Button>
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        {transcript.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="card-title">Simulation Transcript</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {transcript.map((t: any, i: number) => (
                <div key={i} className={`flex ${t.role === "agent" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    t.role === "agent" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"
                  }`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t.speaker || (t.role === "agent" ? "Agent" : "Lead")}</p>
                    <p className="text-sm">{t.content}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // HISTORY
  if (view === "history") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-foreground">Training History</h2>
        </div>
        <Card>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="p-6"><Skeleton className="h-40 w-full" /></div>
            ) : !sessions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-12">No training sessions yet. Run your first simulation!</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {["Date", "Agent", "Scenario", "Difficulty", "Score", "Duration", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-t cursor-pointer hover:bg-secondary/30" onClick={() => { setResult(s); setView("result"); }}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{s.agents?.agent_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{SCENARIOS.find(sc => sc.value === s.scenario)?.label || s.scenario}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{s.difficulty}</Badge></td>
                      <td className="px-4 py-3 text-sm">
                        {s.score != null ? <span className={`font-semibold ${scoreColor(s.score)}`}>{s.score}/100</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.duration_seconds ? formatDuration(s.duration_seconds) : "—"}</td>
                      <td className="px-4 py-3"><Badge variant={s.status === "completed" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

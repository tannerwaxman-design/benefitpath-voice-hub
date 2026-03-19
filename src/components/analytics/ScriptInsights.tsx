import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgents, useUpdateAgent } from "@/hooks/use-agents";
import { RefreshCw, CheckCircle, TrendingUp, AlertTriangle, Lightbulb, XCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface WorkingItem {
  insight: string;
  evidence: string;
  metric?: string;
}

interface Suggestion {
  area: string;
  title: string;
  current_text: string;
  suggested_text: string;
  reasoning: string;
  expected_impact?: string;
}

interface AnalysisResult {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  analyzed_at: string;
  whats_working: WorkingItem[];
  suggestions: Suggestion[];
  discovery_questions: string[];
  phrases_to_avoid: string[];
}

export default function ScriptInsights() {
  const { toast } = useToast();
  const { data: agents } = useAgents();
  const updateAgent = useUpdateAgent();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const activeAgents = agents?.filter(a => a.status === "active" || a.status === "draft") || [];

  const runAnalysis = async () => {
    if (!selectedAgentId) {
      toast({ title: "Select an agent first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setDismissedSuggestions(new Set());
    setAppliedSuggestions(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("analyze-script", {
        body: { agent_id: selectedAgentId },
      });
      if (error) throw error;
      setAnalysis(data);
    } catch (err: unknown) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  const applySuggestion = async (suggestion: Suggestion, index: number) => {
    const agent = agents?.find(a => a.id === selectedAgentId);
    if (!agent) return;

    const updates: Record<string, unknown> = { id: selectedAgentId };

    if (suggestion.area === "opening") {
      updates.greeting_script = suggestion.suggested_text;
    } else if (suggestion.area === "closing") {
      updates.closing_script = suggestion.suggested_text;
    } else if (suggestion.area === "objection") {
      // Find and update matching objection handler
      const handlers = Array.isArray(agent.objection_handling)
        ? [...(agent.objection_handling as Array<{ response?: string }>)]
        : [];
      const matchIdx = handlers.findIndex(
        (h) => suggestion.current_text.includes(h.response?.slice(0, 30) || "___NOMATCH___")
      );
      if (matchIdx >= 0) {
        handlers[matchIdx] = { ...handlers[matchIdx], response: suggestion.suggested_text };
        updates.objection_handling = handlers;
      } else {
        // Add as new handler
        handlers.push({ objection: suggestion.title, response: suggestion.suggested_text });
        updates.objection_handling = handlers;
      }
    }

    try {
      await updateAgent.mutateAsync(updates);
      setAppliedSuggestions(prev => new Set(prev).add(index));
      toast({ title: "Script updated!", description: `Applied: ${suggestion.title}` });
    } catch (err: unknown) {
      toast({ title: "Failed to apply", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const areaIcon = (area: string) => {
    switch (area) {
      case "opening": return "🎯";
      case "closing": return "🏁";
      case "objection": return "🛡️";
      case "discovery": return "🔍";
      default: return "💡";
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent selector + run button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select an agent to analyze" />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.agent_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAnalysis} disabled={loading || !selectedAgentId}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {loading ? "Analyzing..." : "Run Analysis"}
            </Button>
            {analysis && (
              <span className="text-xs text-muted-foreground ml-auto">
                Based on {analysis.total_calls} calls · Last analyzed: {new Date(analysis.analyzed_at).toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!analysis && !loading && (
        <EmptyState
          icon={Lightbulb}
          title="No analysis yet"
          description="Select an agent and run an analysis to get AI-powered script optimization suggestions."
        />
      )}

      {analysis && (
        <>
          {/* What's Working */}
          <Card>
            <CardHeader>
              <CardTitle className="card-title flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                What's Working
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.whats_working.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.insight}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.evidence}</p>
                    {item.metric && (
                      <Badge variant="secondary" className="mt-2 text-xs">{item.metric}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Suggested Improvements */}
          <Card>
            <CardHeader>
              <CardTitle className="card-title flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Suggested Improvements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {analysis.suggestions.map((suggestion, i) => {
                if (dismissedSuggestions.has(i)) return null;
                const isApplied = appliedSuggestions.has(i);

                return (
                  <div key={i} className={`rounded-lg border p-4 space-y-3 ${isApplied ? "border-success/40 bg-success/5" : "border-border"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{areaIcon(suggestion.area)}</span>
                        <h4 className="text-sm font-semibold text-foreground">{suggestion.title}</h4>
                        <Badge variant="outline" className="text-xs capitalize">{suggestion.area}</Badge>
                      </div>
                      {suggestion.expected_impact && (
                        <Badge className="bg-primary/10 text-primary text-xs">{suggestion.expected_impact}</Badge>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">Current</p>
                        <p className="text-sm text-foreground italic">"{suggestion.current_text}"</p>
                      </div>
                      <div className="rounded-md bg-success/5 border border-success/20 p-3">
                        <p className="text-xs font-medium text-success mb-1">Suggested</p>
                        <p className="text-sm text-foreground italic">"{suggestion.suggested_text}"</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground"><strong>Why:</strong> {suggestion.reasoning}</p>

                    <div className="flex gap-2">
                      {isApplied ? (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" /> Applied
                        </Badge>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => applySuggestion(suggestion, i)}>
                            Apply This Change
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDismissedSuggestions(prev => new Set(prev).add(i))}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Discovery Questions & Phrases to Avoid */}
          <div className="grid md:grid-cols-2 gap-4">
            {analysis.discovery_questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="card-title text-sm">🔍 High-Impact Discovery Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.discovery_questions.map((q, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.phrases_to_avoid.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="card-title text-sm">🚫 Phrases to Avoid</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.phrases_to_avoid.map((p, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

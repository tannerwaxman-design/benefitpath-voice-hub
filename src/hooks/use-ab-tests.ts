import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AbTest {
  id: string;
  tenant_id: string;
  agent_id: string;
  field: string;
  version_a_text: string;
  version_b_text: string;
  traffic_split: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  winner: string | null;
  created_at: string;
}

export interface AbTestResults {
  test: AbTest;
  version_a: VersionStats;
  version_b: VersionStats;
  confidence: number;
}

export interface VersionStats {
  calls: number;
  connected: number;
  connect_rate: number;
  avg_duration: number;
  appointments: number;
  appointment_rate: number;
  positive_sentiment_pct: number;
}

export function useAbTests(agentId: string | undefined) {
  return useQuery({
    queryKey: ["ab-tests", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AbTest[];
    },
    enabled: !!agentId,
  });
}

export function useActiveAbTest(agentId: string | undefined, field: string) {
  return useQuery({
    queryKey: ["ab-test-active", agentId, field],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("agent_id", agentId!)
        .eq("field", field)
        .eq("status", "running")
        .maybeSingle();
      if (error) throw error;
      return data as AbTest | null;
    },
    enabled: !!agentId,
  });
}

export function useAbTestResults(testId: string | undefined) {
  return useQuery({
    queryKey: ["ab-test-results", testId],
    queryFn: async () => {
      // Get the test
      const { data: test, error: testErr } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("id", testId!)
        .single();
      if (testErr) throw testErr;

      // Get calls for each version
      const { data: calls, error: callsErr } = await supabase
        .from("calls")
        .select("ab_test_version, outcome, duration_seconds, detected_intent, sentiment")
        .eq("ab_test_id", testId!);
      if (callsErr) throw callsErr;

      const buildStats = (version: string): VersionStats => {
        const vCalls = (calls || []).filter((c) => c.ab_test_version === version);
        const connected = vCalls.filter((c) => ["connected", "completed"].includes(c.outcome));
        const withSentiment = vCalls.filter((c) => c.sentiment);
        const positive = vCalls.filter((c) => c.sentiment === "positive");
        const appointments = vCalls.filter((c) => c.detected_intent === "schedule_appointment");
        return {
          calls: vCalls.length,
          connected: connected.length,
          connect_rate: vCalls.length > 0 ? Math.round((connected.length / vCalls.length) * 1000) / 10 : 0,
          avg_duration: connected.length > 0 ? Math.round(connected.reduce((s: number, c) => s + (c.duration_seconds || 0), 0) / connected.length) : 0,
          appointments: appointments.length,
          appointment_rate: vCalls.length > 0 ? Math.round((appointments.length / vCalls.length) * 1000) / 10 : 0,
          positive_sentiment_pct: withSentiment.length > 0 ? Math.round((positive.length / withSentiment.length) * 1000) / 10 : 0,
        };
      };

      const a = buildStats("a");
      const b = buildStats("b");

      // Simple confidence calculation (approximation)
      const totalCalls = a.calls + b.calls;
      let confidence = 0;
      if (totalCalls > 10) {
        const diff = Math.abs(a.appointment_rate - b.appointment_rate);
        confidence = Math.min(99, Math.round(50 + diff * totalCalls * 0.15));
      }

      return { test: test as AbTest, version_a: a, version_b: b, confidence } as AbTestResults;
    },
    enabled: !!testId,
  });
}

export function useCreateAbTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { agent_id: string; field: string; version_a_text: string; version_b_text: string; traffic_split?: number }) => {
      const { data, error } = await supabase
        .from("ab_tests")
        .insert({
          tenant_id: user!.tenant_id,
          agent_id: params.agent_id,
          field: params.field,
          version_a_text: params.version_a_text,
          version_b_text: params.version_b_text,
          traffic_split: params.traffic_split || 50,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["ab-test-active"] });
      toast({ title: "A/B test started!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create A/B test", description: err.message, variant: "destructive" });
    },
  });
}

export function useEndAbTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { test_id: string; winner?: string }) => {
      const { error } = await supabase
        .from("ab_tests")
        .update({
          status: params.winner ? "completed" : "cancelled",
          ended_at: new Date().toISOString(),
          winner: params.winner || null,
        })
        .eq("id", params.test_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["ab-test-active"] });
      queryClient.invalidateQueries({ queryKey: ["ab-test-results"] });
      toast({ title: "A/B test ended" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to end test", description: err.message, variant: "destructive" });
    },
  });
}

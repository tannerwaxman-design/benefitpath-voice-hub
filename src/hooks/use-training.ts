import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TrainingSession {
  id: string;
  tenant_id: string;
  user_id: string;
  agent_id: string | null;
  mode: "practice_yourself" | "test_agent";
  scenario: string;
  difficulty: "easy" | "medium" | "hard";
  score: number | null;
  score_breakdown: Record<string, number> | null;
  feedback: { strengths: string[]; improvements: string[]; suggested_script?: string } | null;
  transcript: Array<{ role: string; content: string }> | null;
  duration_seconds: number;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
}

export function useTrainingSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["training-sessions", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*, agents(agent_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as (TrainingSession & { agents: { agent_name: string } | null })[];
    },
    enabled: !!user?.tenant_id,
  });
}

export function useRunSimulation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      agent_id: string;
      scenario: string;
      difficulty: string;
      mode: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("run-training-simulation", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Simulation complete!" });
    },
    onError: (err: Error) => {
      toast({ title: "Simulation failed", description: err.message, variant: "destructive" });
    },
  });
}

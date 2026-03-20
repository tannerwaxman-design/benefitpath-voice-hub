import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConversationTurn {
  speaker: "You" | "Lead";
  content: string;
}

/** Start a new Practice Yourself session — returns session_id and the lead's opening message */
export function usePracticeStart() {
  return useMutation({
    mutationFn: async (params: { scenario: string; difficulty: string }) => {
      const { data, error } = await supabase.functions.invoke("practice-yourself-turn", {
        body: { action: "start", ...params },
      });
      if (error) throw error;
      return data as { session_id: string; lead_message: string; is_call_ended: boolean; turn_number: number };
    },
  });
}

/** Send one user message and get the lead's reply */
export function usePracticeTurn() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      session_id: string;
      user_message: string;
      conversation_history: Array<{ role: string; content: string }>;
      scenario: string;
      difficulty: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("practice-yourself-turn", {
        body: { action: "turn", ...params },
      });
      if (error) throw error;
      return data as { session_id: string; lead_message: string; is_call_ended: boolean };
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

/** Finish the session — score the full transcript */
export function usePracticeFinish() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      session_id: string;
      transcript: ConversationTurn[];
      scenario: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("practice-yourself-turn", {
        body: { action: "finish", ...params },
      });
      if (error) throw error;
      return data as {
        session_id: string;
        score: number;
        score_breakdown: Record<string, number>;
        feedback: { strengths: string[]; improvements: string[]; suggested_script: string };
        duration_seconds: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Session scored!" });
    },
    onError: (err: Error) => {
      toast({ title: "Scoring failed", description: err.message, variant: "destructive" });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useCoachingNotes(callId: string | undefined) {
  return useQuery({
    queryKey: ["coaching-notes", callId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_coaching_notes")
        .select("*")
        .eq("call_id", callId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!callId,
  });
}

export function useAddCoachingNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { call_id: string; tenant_id: string; author_user_id: string; author_email: string; note: string }) => {
      const { data, error } = await supabase
        .from("call_coaching_notes")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["coaching-notes", vars.call_id] });
      qc.invalidateQueries({ queryKey: ["coaching-notes-all"] });
      toast({ title: "Note saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save note", description: err.message, variant: "destructive" });
    },
  });
}

export function useTranscriptComments(callId: string | undefined) {
  return useQuery({
    queryKey: ["transcript-comments", callId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_transcript_comments")
        .select("*")
        .eq("call_id", callId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!callId,
  });
}

export function useAddTranscriptComment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { call_id: string; tenant_id: string; author_user_id: string; author_email: string; message_index: number; comment: string }) => {
      const { data, error } = await supabase
        .from("call_transcript_comments")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["transcript-comments", vars.call_id] });
      toast({ title: "Comment added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add comment", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateReviewStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { callId: string; review_status: string; reviewed_by: string }) => {
      const { error } = await supabase
        .from("calls")
        .update({
          review_status: params.review_status,
          reviewed_by: params.reviewed_by,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", params.callId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      toast({ title: "Review status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}

export function useCallsForCoaching(filters?: { review_status?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coaching-calls", user?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("*, agents(agent_name), call_coaching_notes(id, note, author_email, created_at)")
        .order("started_at", { ascending: false })
        .limit(100);

      if (filters?.review_status && filters.review_status !== "all") {
        query = query.eq("review_status", filters.review_status);
      } else {
        query = query.neq("review_status", "not_reviewed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useCoachingStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coaching-stats", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("review_status");
      if (error) throw error;
      const stats = {
        not_reviewed: 0,
        reviewed: 0,
        flagged_for_training: 0,
        needs_improvement: 0,
        excellent_example: 0,
      };
      for (const row of data || []) {
        const s = (row as any).review_status as string;
        if (s in stats) stats[s as keyof typeof stats]++;
      }
      return stats;
    },
    enabled: !!user?.tenant_id,
  });
}

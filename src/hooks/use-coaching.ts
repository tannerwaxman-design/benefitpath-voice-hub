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
      qc.invalidateQueries({ queryKey: ["coaching-calls"] });
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
      qc.invalidateQueries({ queryKey: ["coaching-calls"] });
      qc.invalidateQueries({ queryKey: ["coaching-stats"] });
      toast({ title: "Review status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}

/** Fetch calls for coaching — uses quality_score-based categorization */
export function useCallsForCoaching(section: "needs_review" | "excellent" | "flagged" | "all") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coaching-calls", user?.tenant_id, section],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("*, agents(agent_name, call_objective), call_coaching_notes(id, note, author_email, created_at)")
        .not("quality_score", "is", null)
        .limit(100);

      if (section === "needs_review") {
        // Unreviewed calls that need attention (poor + needs_improvement)
        query = query
          .eq("review_status", "not_reviewed")
          .in("coaching_category", ["needs_improvement", "poor"])
          .order("quality_score", { ascending: true });
      } else if (section === "excellent") {
        query = query
          .eq("coaching_category", "excellent")
          .order("quality_score", { ascending: false });
      } else if (section === "flagged") {
        query = query
          .eq("review_status", "flagged_for_training")
          .order("reviewed_at", { ascending: false });
      } else {
        query = query.order("started_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

/** Real coaching stats based on quality_score */
export function useCoachingStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coaching-stats", user?.tenant_id],
    queryFn: async () => {
      // Fetch all scored calls from last 7 days + unreviewed count
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [allScored, weekScored, flagged] = await Promise.all([
        supabase
          .from("calls")
          .select("quality_score, coaching_category, review_status")
          .not("quality_score", "is", null),
        supabase
          .from("calls")
          .select("quality_score, coaching_category")
          .not("quality_score", "is", null)
          .gte("started_at", sevenDaysAgo),
        supabase
          .from("calls")
          .select("id")
          .eq("review_status", "flagged_for_training"),
      ]);

      if (allScored.error) throw allScored.error;

      const allData = allScored.data || [];
      const weekData = weekScored.data || [];
      const flaggedData = flagged.data || [];

      const needsReview = allData.filter(
        (c) => c.review_status === "not_reviewed" && (c.coaching_category === "needs_improvement" || c.coaching_category === "poor")
      ).length;

      const weekScores = weekData.map((c) => c.quality_score as number).filter(Boolean);
      const avgScore = weekScores.length > 0 ? Math.round(weekScores.reduce((a: number, b: number) => a + b, 0) / weekScores.length) : 0;
      const excellentCount = weekData.filter((c) => c.coaching_category === "excellent").length;
      const needsWorkCount = weekData.filter((c) => c.coaching_category === "needs_improvement" || c.coaching_category === "poor").length;

      return {
        needs_review: needsReview,
        avg_score: avgScore,
        excellent_this_week: excellentCount,
        needs_work_this_week: needsWorkCount,
        flagged: flaggedData.length,
      };
    },
    enabled: !!user?.tenant_id,
  });
}

/** Score distribution for chart */
export function useScoreDistribution() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["score-distribution", user?.tenant_id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("calls")
        .select("quality_score")
        .not("quality_score", "is", null)
        .gte("started_at", thirtyDaysAgo);
      if (error) throw error;

      const dist = { excellent: 0, good: 0, needs_improvement: 0, poor: 0 };
      for (const row of data || []) {
        const s = row.quality_score as number;
        if (s >= 90) dist.excellent++;
        else if (s >= 75) dist.good++;
        else if (s >= 60) dist.needs_improvement++;
        else dist.poor++;
      }
      const total = data?.length || 1;
      return {
        excellent: { count: dist.excellent, pct: Math.round((dist.excellent / total) * 100) },
        good: { count: dist.good, pct: Math.round((dist.good / total) * 100) },
        needs_improvement: { count: dist.needs_improvement, pct: Math.round((dist.needs_improvement / total) * 100) },
        poor: { count: dist.poor, pct: Math.round((dist.poor / total) * 100) },
        total,
      };
    },
    enabled: !!user?.tenant_id,
  });
}

/** Top coaching tags */
export function useTopCoachingTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coaching-tags", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("coaching_tags")
        .not("coaching_tags", "is", null);
      if (error) throw error;

      const tagCounts: Record<string, number> = {};
      for (const row of data || []) {
        const tags = row.coaching_tags as string[];
        if (Array.isArray(tags)) {
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      }

      return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
    enabled: !!user?.tenant_id,
  });
}

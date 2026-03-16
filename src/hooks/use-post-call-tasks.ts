import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePostCallTasks(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["post_call_tasks", user?.tenant_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_call_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status, completedBy }: { taskId: string; status: string; completedBy?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "done") {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = completedBy || null;
      }
      const { error } = await supabase.from("post_call_tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post_call_tasks"] }),
  });
}

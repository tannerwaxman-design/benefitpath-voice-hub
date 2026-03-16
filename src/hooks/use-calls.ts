import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type CallRow = Tables<"calls">;

export function useCalls(filters?: { outcome?: string; direction?: string; search?: string; limit?: number }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calls", user?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("*, agents(agent_name), campaigns(name)")
        .order("started_at", { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.outcome && filters.outcome !== "all") {
        query = query.eq("outcome", filters.outcome);
      }
      if (filters?.direction && filters.direction !== "all") {
        query = query.eq("direction", filters.direction);
      }
      if (filters?.search) {
        query = query.or(`contact_name.ilike.%${filters.search}%,to_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useRecentCalls(limit = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-calls", user?.tenant_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
    refetchInterval: 5 * 60 * 1000,
  });
}

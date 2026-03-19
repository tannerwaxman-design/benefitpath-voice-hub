import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const tenantId = user?.tenant_id;

  // Realtime: invalidate calls + analytics queries whenever a call row changes
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`calls-realtime-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["calls", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["recent-calls", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["analytics-summary", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["calls-per-day", tenantId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["calls", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["recent-calls", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["analytics-summary", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["calls-per-day", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["recent-calls", tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

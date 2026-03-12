import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAnalyticsSummary(dateFrom: string, dateTo: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics-summary", user?.tenant_id, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_analytics_summary", {
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useCallsPerDay(dateFrom: string, dateTo: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calls-per-day", user?.tenant_id, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_calls_per_day", {
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.tenant_id,
  });
}

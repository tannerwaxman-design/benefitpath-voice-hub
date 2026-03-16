import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCampaignDetail(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, agents(agent_name, call_objective, tone), contact_lists(name, total_contacts)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.tenant_id,
  });
}

export function useCampaignContacts(campaignId: string | undefined, statusFilter?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaign-contacts", campaignId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("campaign_contacts")
        .select("*, contacts(first_name, last_name, phone, email, company)")
        .eq("campaign_id", campaignId!)
        .order("priority", { ascending: true })
        .limit(200);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });
}

export function useCampaignCalls(campaignId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaign-calls", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, agents(agent_name)")
        .eq("campaign_id", campaignId!)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });
}

export function useCampaignDailyStats(campaignId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaign-daily-stats", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("started_at, outcome, duration_seconds, sentiment, quality_score")
        .eq("campaign_id", campaignId!)
        .order("started_at", { ascending: true });
      if (error) throw error;

      // Aggregate by day
      const byDay: Record<string, { date: string; total: number; connected: number; appointments: number }> = {};
      for (const call of data || []) {
        const day = new Date(call.started_at).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { date: day, total: 0, connected: 0, appointments: 0 };
        byDay[day].total++;
        if (["connected", "completed"].includes(call.outcome)) byDay[day].connected++;
        if (call.outcome === "completed") byDay[day].appointments++;
      }

      // Outcome breakdown
      const outcomes: Record<string, number> = {};
      for (const call of data || []) {
        outcomes[call.outcome] = (outcomes[call.outcome] || 0) + 1;
      }

      return {
        daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        outcomes,
        totalCalls: data?.length || 0,
      };
    },
    enabled: !!campaignId && !!user?.tenant_id,
  });
}

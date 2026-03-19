import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeadContact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  company: string | null;
  lead_score: number | null;
  lead_status: string | null;
  lead_summary: string | null;
  recommended_action: string | null;
  lead_score_updated_at: string | null;
  total_calls: number;
  last_called_at: string | null;
  last_outcome: string | null;
  dnc_status: boolean;
  tags: string[] | null;
}

export function useLeads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leads", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, phone, email, company, lead_score, lead_status, lead_summary, recommended_action, lead_score_updated_at, total_calls, last_called_at, last_outcome, dnc_status, tags")
        .not("lead_score", "is", null)
        .order("lead_score", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as LeadContact[];
    },
    enabled: !!user?.tenant_id,
  });
}

export function useLeadStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead-stats", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("lead_score, lead_status")
        .not("lead_score", "is", null);
      if (error) throw error;
      const all = data || [];
      return {
        hot: all.filter((c: any) => c.lead_status === "hot").length,
        warm: all.filter((c: any) => c.lead_status === "warm").length,
        cold: all.filter((c: any) => c.lead_status === "cold").length,
        dead: all.filter((c: any) => c.lead_status === "dead").length,
        total: all.length,
      };
    },
    enabled: !!user?.tenant_id,
  });
}

export function useLeadCalls(contactId: string | undefined) {
  return useQuery({
    queryKey: ["lead-calls", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, started_at, duration_seconds, outcome, summary, quality_score, contact_name, agents(agent_name), campaign_id")
        .eq("contact_id", contactId!)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });
}

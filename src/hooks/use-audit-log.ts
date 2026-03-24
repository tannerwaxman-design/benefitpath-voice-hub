import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

export function useAuditLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["audit-log", user?.tenant_id],
    queryFn: async () => {
      // Use usage_logs as an audit trail since it tracks events
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useLogAction() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { action: string; resource_type: string; resource_id?: string; details?: string }) => {
      const { error } = await supabase.from("usage_logs").insert({
        tenant_id: user!.tenant_id,
        event_type: params.action,
        quantity: 0,
        unit_cost: 0,
        total_cost: 0,
        metadata: {
          resource_type: params.resource_type,
          resource_id: params.resource_id,
          details: params.details,
          user_email: user?.email,
        },
      });
      if (error) throw error;
    },
  });
}

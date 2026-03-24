import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

export function useBillingUsage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["billing-usage", user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;

      // Get tenant info
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", user.tenant_id)
        .single();

      if (!tenant) return null;

      // Get usage logs for current cycle
      const { data: usageLogs } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("tenant_id", user.tenant_id)
        .gte("created_at", tenant.billing_cycle_start)
        .lte("created_at", tenant.billing_cycle_end)
        .order("created_at", { ascending: false });

      // Get call cost breakdown for current cycle
      const { data: calls } = await supabase
        .from("calls")
        .select("cost_vapi, cost_transport, cost_stt, cost_llm, cost_tts, cost_total, cost_with_margin, cost_minutes, duration_seconds, started_at, outcome")
        .eq("tenant_id", user.tenant_id)
        .gte("started_at", tenant.billing_cycle_start)
        .order("started_at", { ascending: false });

      // Aggregate costs
      const costSummary = (calls || []).reduce(
        (acc, c) => ({
          vapi: acc.vapi + (Number(c.cost_vapi) || 0),
          transport: acc.transport + (Number(c.cost_transport) || 0),
          stt: acc.stt + (Number(c.cost_stt) || 0),
          llm: acc.llm + (Number(c.cost_llm) || 0),
          tts: acc.tts + (Number(c.cost_tts) || 0),
          total: acc.total + (Number(c.cost_total) || 0),
          withMargin: acc.withMargin + (Number(c.cost_with_margin) || 0),
          totalMinutes: acc.totalMinutes + (Number(c.cost_minutes) || 0),
          totalCalls: acc.totalCalls + 1,
        }),
        { vapi: 0, transport: 0, stt: 0, llm: 0, tts: 0, total: 0, withMargin: 0, totalMinutes: 0, totalCalls: 0 }
      );

      // Daily usage history for current billing cycle
      const dailyHistory: Record<string, { minutes: number; cost: number }> = {};
      for (const call of calls || []) {
        const day = new Date(call.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!dailyHistory[day]) dailyHistory[day] = { minutes: 0, cost: 0 };
        dailyHistory[day].minutes += Number(call.cost_minutes) || 0;
        dailyHistory[day].cost += Number(call.cost_with_margin) || 0;
      }

      const usageHistory = Object.entries(dailyHistory).map(([day, data]) => ({
        day,
        minutes: parseFloat(data.minutes.toFixed(1)),
        cost: parseFloat(data.cost.toFixed(4)),
      }));

      return {
        tenant,
        costSummary,
        usageLogs: usageLogs || [],
        usageHistory,
      };
    },
    enabled: !!user?.tenant_id,
  });
}

export function useUpdateBillingSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      hard_stop_enabled?: boolean;
      usage_alert_threshold?: number;
      margin_percent?: number;
      auto_refill_enabled?: boolean;
      auto_refill_threshold?: number;
      auto_refill_package?: string;
    }) => {
      const { error } = await supabase
        .from("tenants")
        .update(settings)
        .eq("id", user?.tenant_id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "billing.settings_updated",
        entity_type: "billing",
        metadata: variables as Record<string, unknown>,
      });
      queryClient.invalidateQueries({ queryKey: ["billing-usage"] });
      toast({ title: "Billing settings updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update settings", description: err.message, variant: "destructive" });
    },
  });
}

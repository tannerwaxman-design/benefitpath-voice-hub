import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

export function useCampaigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["campaigns", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, agents(agent_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (campaignData: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...campaignData, tenant_id: user!.tenant_id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "campaign.created",
        entity_type: "campaign",
        entity_id: (data as { id?: string } | null)?.id ?? null,
        entity_name: (data as { name?: string } | null)?.name ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create campaign", description: err.message, variant: "destructive" });
    },
  });
}

const CAMPAIGN_ACTION_EVENT: Record<string, string> = {
  start: "campaign.launched",
  resume: "campaign.launched",
  pause: "campaign.paused",
  cancel: "campaign.cancelled",
};

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { campaign_id: string; action: string }) => {
      const { data, error } = await supabase.functions.invoke("launch-campaign", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const eventType = CAMPAIGN_ACTION_EVENT[variables.action] ?? `campaign.${variables.action}`;
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: eventType,
        entity_type: "campaign",
        entity_id: variables.campaign_id,
        metadata: { action: variables.action },
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign updated", description: data?.message });
    },
    onError: (err: Error) => {
      toast({ title: "Campaign action failed", description: err.message, variant: "destructive" });
    },
  });
}

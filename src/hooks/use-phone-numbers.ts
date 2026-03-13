import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function usePhoneNumbers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["phone-numbers", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*, agents(id, agent_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useProvisionPhoneNumber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { area_code: string; number_type: string }) => {
      const { data, error } = await supabase.functions.invoke("provision-phone-number", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      toast({ title: "Phone number provisioned!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to provision number", description: err.message, variant: "destructive" });
    },
  });
}

export function useAssignPhoneNumber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ phoneId, agentId }: { phoneId: string; agentId: string | null }) => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .update({ assigned_agent_id: agentId })
        .eq("id", phoneId)
        .select("*, agents(id, agent_name)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      const agentName = data.agents?.agent_name;
      toast({
        title: agentName ? `Assigned to ${agentName}` : "Agent unassigned",
        description: `Phone number ${data.phone_number} updated.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to assign number", description: err.message, variant: "destructive" });
    },
  });
}

export function useSetDefaultPhoneNumber() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phoneId: string) => {
      // Unset all defaults first, then set the new one
      await supabase
        .from("phone_numbers")
        .update({ is_default: false })
        .neq("id", phoneId);

      const { data, error } = await supabase
        .from("phone_numbers")
        .update({ is_default: true })
        .eq("id", phoneId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      toast({ title: "Default number set", description: data.phone_number });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to set default", description: err.message, variant: "destructive" });
    },
  });
}

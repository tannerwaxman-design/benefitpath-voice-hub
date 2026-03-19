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
        .select("*, agents(id, agent_name, call_direction)")
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

export function useImportTwilioNumber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      phone_number: string;
      twilio_account_sid: string;
      twilio_auth_token: string;
      friendly_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("import-twilio-number", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      toast({ title: "Twilio number imported!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to import number", description: err.message, variant: "destructive" });
    },
  });
}

export function useSearchTwilioNumbers() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      area_code?: string;
      number_type: string;
      twilio_account_sid: string;
      twilio_auth_token: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("buy-twilio-number", {
        body: { ...params, action: "search" },
      });
      if (error) throw error;
      return data;
    },
    onError: (err: Error) => {
      toast({ title: "Failed to search numbers", description: err.message, variant: "destructive" });
    },
  });
}

export function useBuyTwilioNumber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      phone_number: string;
      number_type: string;
      twilio_account_sid: string;
      twilio_auth_token: string;
      friendly_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("buy-twilio-number", {
        body: { ...params, action: "buy" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      toast({ title: "Twilio number purchased and registered!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to buy number", description: err.message, variant: "destructive" });
    },
  });
}

export function useAssignPhoneNumber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ phoneId, agentId }: { phoneId: string; agentId: string | null }) => {
      const { data, error } = await supabase.functions.invoke("assign-phone-number", {
        body: { phone_id: phoneId, agent_id: agentId },
      });
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

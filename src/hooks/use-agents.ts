import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

export function useAgents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agents", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("create-agent", {
        body: formData,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "agent.created",
        entity_type: "agent",
        entity_id: (data?.agent?.id ?? data?.id ?? null) as string | null,
        entity_name: (variables.agent_name ?? variables.name ?? null) as string | null,
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Agent created", description: data?.vapi_synced ? "Synced with voice engine" : "Saved locally" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create agent", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("update-agent", {
        body: formData,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "agent.updated",
        entity_type: "agent",
        entity_id: (variables.agent_id ?? variables.id ?? null) as string | null,
        entity_name: (variables.agent_name ?? variables.name ?? null) as string | null,
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent"] });
      toast({ title: "Agent updated", description: data?.vapi_synced ? "Synced with voice engine" : "Saved locally" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update agent", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-agent", {
        body: { agent_id: agentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, agentId) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "agent.deleted",
        entity_type: "agent",
        entity_id: agentId,
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Agent deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete agent", description: err.message, variant: "destructive" });
    },
  });
}

export function useTestCall() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { agent_id: string; contact_phone: string; contact_name: string }) => {
      const { data, error } = await supabase.functions.invoke("launch-call", {
        body: { ...params, is_test_call: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Test call launched!", description: "You should receive a call shortly." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to launch test call", description: err.message, variant: "destructive" });
    },
  });
}

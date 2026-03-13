import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Tool {
  id: string;
  tenant_id: string;
  vapi_tool_id: string | null;
  name: string;
  description: string;
  template: string | null;
  service: string;
  parameters: ToolParameter[];
  message_start: string | null;
  message_complete: string | null;
  message_failed: string | null;
  service_config: Record<string, unknown>;
  assigned_agent_ids: string[];
  status: string;
  total_uses: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolParameter {
  name: string;
  label: string;
  ai_prompt: string;
  type: string;
  required: boolean;
  enabled: boolean;
}

export interface ToolApiKey {
  id: string;
  tenant_id: string;
  service: string;
  api_key: string;
  additional_config: Record<string, unknown>;
  display_name: string | null;
  status: string;
  connected_at: string;
  last_verified_at: string | null;
}

export interface ToolActivityEntry {
  id: string;
  tool_id: string;
  call_id: string | null;
  status: string;
  summary: string | null;
  error_message: string | null;
  created_at: string;
}

export function useTools() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tools", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Tool[];
    },
    enabled: !!user?.tenant_id,
  });
}

export function useToolApiKeys() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tool_api_keys", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_api_keys")
        .select("*")
        .order("connected_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ToolApiKey[];
    },
    enabled: !!user?.tenant_id,
  });
}

export function useToolActivity(toolId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tool_activity", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_activity_log")
        .select("*")
        .eq("tool_id", toolId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as ToolActivityEntry[];
    },
    enabled: !!user?.tenant_id && !!toolId,
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tool: Partial<Tool>) => {
      const { data, error } = await supabase
        .from("tools")
        .insert({ ...tool, tenant_id: user!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Tool created", description: "Your new tool is ready to assign to agents." });
    },
    onError: (err: Error) => {
      toast({ title: "Error creating tool", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tool> & { id: string }) => {
      const { data, error } = await supabase
        .from("tools")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Tool updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error updating tool", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteTool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Tool deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting tool", description: err.message, variant: "destructive" });
    },
  });
}

export function useConnectApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { service: string; api_key: string; additional_config?: Record<string, unknown>; display_name?: string }) => {
      const { data, error } = await supabase
        .from("tool_api_keys")
        .upsert(
          { ...payload, tenant_id: user!.tenant_id, status: "active", connected_at: new Date().toISOString() } as any,
          { onConflict: "tenant_id,service" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ToolApiKey;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      toast({ title: `${vars.service} connected`, description: "API key saved securely." });
    },
    onError: (err: Error) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useDisconnectApiKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tool_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      toast({ title: "API key disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

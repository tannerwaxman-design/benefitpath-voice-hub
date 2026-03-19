import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/audit";

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

// ─── Queries ───

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
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as ToolActivityEntry[];
    },
    enabled: !!user?.tenant_id && !!toolId,
  });
}

// ─── Mutations ───

export function useVerifyApiKey() {
  return useMutation({
    mutationFn: async (payload: {
      service: string;
      api_key?: string;
      additional_config?: Record<string, unknown>;
      reverify?: boolean;
      tenant_id?: string;
    }): Promise<{ valid: boolean; error?: string; account_name?: string; calendars?: { id: string; name: string }[] }> => {
      const { data, error } = await supabase.functions.invoke("verify-api-key", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tool: Partial<Tool>) => {
      // Step 1: Save to DB
      const { data, error } = await supabase
        .from("tools")
        .insert({ ...tool, tenant_id: user!.tenant_id } as TablesInsert<"tools">)
        .select()
        .single();
      if (error) throw error;
      const savedTool = data as unknown as Tool;

      // Step 2: Create in VAPI and save vapi_tool_id
      try {
        await supabase.functions.invoke("manage-tool", {
          body: { action: "create", tool: savedTool, tool_id: savedTool.id },
        });
      } catch (e) {
        console.error("VAPI tool creation failed:", e);
        // Tool is saved locally even if VAPI fails
      }

      return savedTool;
    },
    onSuccess: (savedTool) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "tool.created",
        entity_type: "tool",
        entity_id: savedTool.id,
        entity_name: savedTool.name,
        metadata: { service: savedTool.service, template: savedTool.template },
      });
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
        .update(updates as TablesUpdate<"tools">)
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
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the tool to check for vapi_tool_id
      const { data: tool } = await supabase
        .from("tools")
        .select("vapi_tool_id")
        .eq("id", id)
        .single();

      // Delete from VAPI first
      if (tool && tool.vapi_tool_id) {
        try {
          await supabase.functions.invoke("manage-tool", {
            body: { action: "delete", vapi_tool_id: tool.vapi_tool_id },
          });
        } catch (e) {
          console.error("VAPI tool deletion failed:", e);
        }
      }

      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, toolId) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "tool.deleted",
        entity_type: "tool",
        entity_id: toolId,
      });
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
          { ...payload, tenant_id: user!.tenant_id, status: "active", connected_at: new Date().toISOString(), last_verified_at: new Date().toISOString() } as TablesInsert<"tool_api_keys">,
          { onConflict: "tenant_id,service" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ToolApiKey;
    },
    onSuccess: (data, vars) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "tool.api_key_connected",
        entity_type: "tool",
        entity_id: data?.id ?? null,
        entity_name: vars.display_name ?? vars.service,
        metadata: { service: vars.service },
      });
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      toast({ title: `${vars.display_name || vars.service} connected`, description: "API key verified and saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useDisconnectApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, service }: { id: string; service: string }) => {
      // Use manage-tool to properly disconnect (deactivate + remove VAPI tools)
      try {
        await supabase.functions.invoke("manage-tool", {
          body: { action: "disconnect_service", service, tenant_id: user!.tenant_id },
        });
      } catch (e) {
        console.error("Service disconnect via manage-tool failed:", e);
      }

      // Delete the key record
      const { error } = await supabase.from("tool_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "tool.api_key_disconnected",
        entity_type: "tool",
        entity_name: vars.service,
        metadata: { service: vars.service },
      });
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "API key disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useAssignToolToAgents() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ toolId, agentIds }: { toolId: string; agentIds: string[] }) => {
      // Update tool's assigned_agent_ids
      const { error } = await supabase
        .from("tools")
        .update({ assigned_agent_ids: agentIds as unknown as Json })
        .eq("id", toolId);
      if (error) throw error;

      // For each agent, get their vapi_assistant_id and assign tools
      for (const agentId of agentIds) {
        const { data: agent } = await supabase
          .from("agents")
          .select("vapi_assistant_id")
          .eq("id", agentId)
          .single();

        if (agent?.vapi_assistant_id) {
          // Get all tools assigned to this agent
          const { data: agentTools } = await supabase
            .from("tools")
            .select("vapi_tool_id")
            .eq("status", "active")
            .contains("assigned_agent_ids", [agentId] as unknown as string[]);

          const toolIds = (agentTools || [])
            .map((t) => t.vapi_tool_id)
            .filter(Boolean);

          try {
            await supabase.functions.invoke("manage-tool", {
              body: {
                action: "assign",
                assistant_id: agent.vapi_assistant_id,
                tool_ids: toolIds,
              },
            });
          } catch (e) {
            console.error(`Failed to assign tools to agent ${agentId}:`, e);
          }
        }
      }
    },
    onSuccess: (_data, vars) => {
      logAudit({
        tenant_id: user!.tenant_id,
        user_id: user!.id,
        event_type: "tool.agents_assigned",
        entity_type: "tool",
        entity_id: vars.toolId,
        metadata: { agent_ids: vars.agentIds },
      });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Tools assigned to agents" });
    },
    onError: (err: Error) => {
      toast({ title: "Error assigning tools", description: err.message, variant: "destructive" });
    },
  });
}

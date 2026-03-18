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

// ==========================================
// QUERIES
// ==========================================

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

// ==========================================
// MUTATIONS
// ==========================================

export function useVerifyApiKey() {
  return useMutation({
    mutationFn: async (payload: {
      service: string;
      api_key: string;
      additional_config?: Record<string, unknown>;
      display_name?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("verify-tool-key", {
        body: payload,
      });
      if (error) throw error;
      return data as { valid: boolean; error?: string; account_name?: string };
    },
  });
}

export function useReverifyApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { service: string; key_id: string }) => {
      const { data, error } = await supabase.functions.invoke("verify-tool-key", {
        body: { ...payload, reverify: true },
      });
      if (error) throw error;
      return data as { valid: boolean; error?: string };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
    },
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tool: Partial<Tool>) => {
      // 1. Save to our DB
      const { data, error } = await supabase
        .from("tools")
        .insert({ ...tool, tenant_id: user!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      const savedTool = data as unknown as Tool;

      // 2. Create in VAPI via edge function
      try {
        const { data: vapiResult, error: vapiError } = await supabase.functions.invoke("manage-tool", {
          body: { action: "create", tool: savedTool },
        });
        if (vapiError) throw vapiError;

        // 3. Save VAPI tool ID back
        if (vapiResult?.vapi_tool_id) {
          await supabase
            .from("tools")
            .update({ vapi_tool_id: vapiResult.vapi_tool_id } as any)
            .eq("id", savedTool.id);
          savedTool.vapi_tool_id = vapiResult.vapi_tool_id;
        }

        // 4. If agents are assigned, attach tool to their VAPI assistants
        const agentIds = tool.assigned_agent_ids || [];
        if (agentIds.length > 0 && vapiResult?.vapi_tool_id) {
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
                .contains("assigned_agent_ids", [agentId] as any)
                .not("vapi_tool_id", "is", null);

              const toolIds = (agentTools || []).map((t: any) => t.vapi_tool_id).filter(Boolean);
              if (!toolIds.includes(vapiResult.vapi_tool_id)) {
                toolIds.push(vapiResult.vapi_tool_id);
              }

              await supabase.functions.invoke("manage-tool", {
                body: { action: "assign", assistant_id: agent.vapi_assistant_id, tool_ids: toolIds },
              });
            }
          }
        }
      } catch (vapiErr) {
        console.error("VAPI tool creation failed:", vapiErr);
        // Tool is saved locally, VAPI sync failed — don't block
      }

      return savedTool;
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
      // Get the tool to find VAPI ID and assigned agents
      const { data: tool } = await supabase
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

      if (tool) {
        const toolData = tool as unknown as Tool;

        // Remove from VAPI
        if (toolData.vapi_tool_id) {
          try {
            await supabase.functions.invoke("manage-tool", {
              body: { action: "delete", vapi_tool_id: toolData.vapi_tool_id },
            });
          } catch (e) {
            console.error("Failed to delete VAPI tool:", e);
          }

          // Update assigned agents' VAPI assistants
          for (const agentId of toolData.assigned_agent_ids || []) {
            try {
              const { data: agent } = await supabase
                .from("agents")
                .select("vapi_assistant_id")
                .eq("id", agentId)
                .single();

              if (agent?.vapi_assistant_id) {
                const { data: remainingTools } = await supabase
                  .from("tools")
                  .select("vapi_tool_id")
                  .contains("assigned_agent_ids", [agentId] as any)
                  .not("vapi_tool_id", "is", null)
                  .neq("id", id);

                const toolIds = (remainingTools || []).map((t: any) => t.vapi_tool_id).filter(Boolean);
                await supabase.functions.invoke("manage-tool", {
                  body: { action: "assign", assistant_id: agent.vapi_assistant_id, tool_ids: toolIds },
                });
              }
            } catch (e) {
              console.error("Failed to update agent tools:", e);
            }
          }
        }
      }

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { service: string; api_key: string; additional_config?: Record<string, unknown>; display_name?: string }) => {
      // Validate first via edge function (which also saves if valid)
      const { data, error } = await supabase.functions.invoke("verify-tool-key", {
        body: payload,
      });
      if (error) throw error;
      const result = data as { valid: boolean; error?: string; account_name?: string };
      if (!result.valid) {
        throw new Error(result.error || "API key validation failed");
      }
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      toast({ title: `${vars.display_name || vars.service} connected`, description: "API key verified and saved securely." });
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
    mutationFn: async ({ id, service }: { id: string; service: string }) => {
      // Deactivate key (don't delete — they might reconnect)
      const { error } = await supabase
        .from("tool_api_keys")
        .update({ status: "inactive" } as any)
        .eq("id", id);
      if (error) throw error;

      // Find and remove VAPI tools that depend on this service
      const { data: affectedTools } = await supabase
        .from("tools")
        .select("*")
        .eq("service", service)
        .not("vapi_tool_id", "is", null);

      for (const tool of (affectedTools || []) as unknown as Tool[]) {
        if (tool.vapi_tool_id) {
          try {
            await supabase.functions.invoke("manage-tool", {
              body: { action: "delete", vapi_tool_id: tool.vapi_tool_id },
            });
          } catch (e) {
            console.error("Failed to remove VAPI tool:", e);
          }
        }

        // Update each affected agent
        for (const agentId of tool.assigned_agent_ids || []) {
          try {
            const { data: agent } = await supabase
              .from("agents")
              .select("vapi_assistant_id")
              .eq("id", agentId)
              .single();

            if (agent?.vapi_assistant_id) {
              const { data: remainingTools } = await supabase
                .from("tools")
                .select("vapi_tool_id")
                .contains("assigned_agent_ids", [agentId] as any)
                .not("vapi_tool_id", "is", null)
                .neq("service", service);

              const toolIds = (remainingTools || []).map((t: any) => t.vapi_tool_id).filter(Boolean);
              await supabase.functions.invoke("manage-tool", {
                body: { action: "assign", assistant_id: agent.vapi_assistant_id, tool_ids: toolIds },
              });
            }
          } catch (e) {
            console.error("Failed to update agent:", e);
          }
        }

        // Mark tool as inactive
        await supabase.from("tools").update({ status: "inactive", vapi_tool_id: null } as any).eq("id", tool.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool_api_keys"] });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "API key disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

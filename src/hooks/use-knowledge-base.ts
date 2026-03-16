import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  company_info: string;
  faq_pairs: { question: string; answer: string }[];
  website_url: string | null;
  website_content: string | null;
  website_imported_at: string | null;
  assigned_agent_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["knowledge-base", user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("tenant_id", user.tenant_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Auto-create
        const { data: created, error: createErr } = await supabase
          .from("knowledge_base")
          .insert({ tenant_id: user.tenant_id })
          .select()
          .single();
        if (createErr) throw createErr;
        return created as unknown as KnowledgeBase;
      }
      return data as unknown as KnowledgeBase;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<KnowledgeBase, "company_info" | "faq_pairs" | "website_url" | "website_content" | "website_imported_at" | "assigned_agent_ids">>) => {
      const { error } = await supabase
        .from("knowledge_base")
        .update(updates as any)
        .eq("tenant_id", user?.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      toast({ title: "Knowledge base updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}

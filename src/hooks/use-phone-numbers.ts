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
        .select("*, agents(agent_name)")
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

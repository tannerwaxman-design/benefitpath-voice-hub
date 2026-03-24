import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAnySoaEnabled() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["any-soa-enabled", user?.tenant_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("soa_enabled", true);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!user?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}

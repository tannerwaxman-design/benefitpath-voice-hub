import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreditPurchase {
  id: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: string;
}

export interface SubscriptionInvoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  description: string;
  date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export function useBillingHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["billing-history", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-billing-history");
      if (error) throw error;
      return data as { purchases: CreditPurchase[]; invoices: SubscriptionInvoice[] };
    },
    enabled: !!user?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

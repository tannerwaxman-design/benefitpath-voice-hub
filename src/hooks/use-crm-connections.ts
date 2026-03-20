import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type CrmProvider =
  | "salesforce"
  | "hubspot"
  | "zoho_crm"
  | "google_calendar"
  | "outlook_calendar"
  | "calendly";

export interface CrmConnection {
  id: string;
  provider: CrmProvider;
  status: "connected" | "disconnected" | "error";
  account_name: string | null;
  account_email: string | null;
  created_at: string;
  updated_at: string;
}

export function useCrmConnections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["crm-connections", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_connections")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmConnection[];
    },
    enabled: !!user?.tenant_id,
  });
}

/** Returns the connection record for a specific provider, or undefined */
export function useCrmConnection(provider: CrmProvider) {
  const { data: connections } = useCrmConnections();
  return connections?.find((c) => c.provider === provider);
}

/** Initiates OAuth flow by opening a popup window */
export function useConnectCrm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: CrmProvider) => {
      const { data, error } = await supabase.functions.invoke("crm-oauth-init", {
        body: { provider },
      });
      if (error) throw error;
      const { authorization_url } = data as { authorization_url: string };

      // Open OAuth popup
      const popup = window.open(
        authorization_url,
        "oauth_popup",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Wait for the callback page to post a message
      return new Promise<void>((resolve, reject) => {
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type !== "oauth_callback") return;
          window.removeEventListener("message", handleMessage);
          popup.close();

          const { code, state } = event.data;
          if (!code) {
            reject(new Error("OAuth cancelled or failed"));
            return;
          }

          const { error: callbackError } = await supabase.functions.invoke("crm-oauth-callback", {
            body: { provider, code, state },
          });

          if (callbackError) {
            reject(callbackError);
          } else {
            resolve();
          }
        };

        window.addEventListener("message", handleMessage);

        // Cleanup if popup is closed without completing
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", handleMessage);
            reject(new Error("OAuth window closed before completing"));
          }
        }, 500);
      });
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["crm-connections"] });
      toast({ title: "Connected!", description: `${formatProvider(provider)} has been connected.` });
    },
    onError: (err: Error) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });
}

/** Disconnect (delete) a CRM connection */
export function useDisconnectCrm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: CrmProvider) => {
      const { error } = await supabase
        .from("crm_connections")
        .delete()
        .eq("provider", provider);
      if (error) throw error;
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["crm-connections"] });
      toast({ title: "Disconnected", description: `${formatProvider(provider)} has been disconnected.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to disconnect", description: err.message, variant: "destructive" });
    },
  });
}

export function formatProvider(provider: CrmProvider): string {
  const names: Record<CrmProvider, string> = {
    salesforce: "Salesforce",
    hubspot: "HubSpot",
    zoho_crm: "Zoho CRM",
    google_calendar: "Google Calendar",
    outlook_calendar: "Outlook Calendar",
    calendly: "Calendly",
  };
  return names[provider] ?? provider;
}

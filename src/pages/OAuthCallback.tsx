import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth callback page.
 * After the CRM/Calendar provider redirects here, we:
 * 1. Extract code + state from the URL
 * 2. Exchange the code for tokens via the crm-oauth-callback edge function
 * 3. Post a message to the opener window so the Settings page can react
 * 4. Close this window (or redirect if not in a popup)
 */
export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    // If opened in a popup, post the result back to the opener and close
    if (window.opener) {
      if (error || !code) {
        window.opener.postMessage({ type: "oauth_callback", error: error ?? "No code received" }, "*");
      } else {
        // The actual token exchange happens in the opener's useConnectCrm hook
        // after receiving this message
        window.opener.postMessage({ type: "oauth_callback", code, state }, "*");
      }
      window.close();
      return;
    }

    // If not in a popup (direct navigation), exchange the code server-side
    // and redirect to settings
    if (code && state) {
      const providerMatch = state.match(/provider=([^&]+)/);
      const provider = providerMatch?.[1];
      if (provider) {
        supabase.functions
          .invoke("crm-oauth-callback", { body: { provider, code } })
          .finally(() => {
            navigate("/settings?tab=integrations", { replace: true });
          });
      } else {
        navigate("/settings", { replace: true });
      }
    } else {
      navigate("/settings", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Completing connection…</p>
      </div>
    </div>
  );
}

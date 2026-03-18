import { useState, useEffect } from "react";
import { Check, Plus, X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToolApiKeys, useConnectApiKey, useDisconnectApiKey, useVerifyApiKey, type ToolApiKey } from "@/hooks/use-tools";
import { useAuth } from "@/contexts/AuthContext";

const SERVICES = [
  { id: "ghl", label: "GoHighLevel", helpUrl: "https://highlevel.stoplight.io/docs/integrations/", extraFields: [{ key: "location_id", label: "Location ID", help: "Found in Settings → Business Info in your GHL sub-account" }] },
  { id: "hubspot", label: "HubSpot", helpUrl: "https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key" },
  { id: "google_calendar", label: "Google Calendar", helpUrl: "https://developers.google.com/calendar/api/guides/overview" },
  { id: "salesforce", label: "Salesforce", helpUrl: "https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm", extraFields: [{ key: "instance_url", label: "Instance URL", help: "e.g. https://yourcompany.my.salesforce.com" }] },
  { id: "zapier", label: "Zapier", helpUrl: "https://zapier.com/help/create/basics/get-started-with-zapier" },
  { id: "custom", label: "Custom", helpUrl: "" },
];

export function ApiKeysBar() {
  const { data: apiKeys = [] } = useToolApiKeys();
  const connectMutation = useConnectApiKey();
  const disconnectMutation = useDisconnectApiKey();
  const verifyMutation = useVerifyApiKey();
  const { user } = useAuth();

  const [connectingService, setConnectingService] = useState<typeof SERVICES[0] | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [extraInputs, setExtraInputs] = useState<Record<string, string>>({});
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [disconnectTarget, setDisconnectTarget] = useState<{ key: ToolApiKey; service: typeof SERVICES[0] } | null>(null);

  // Track invalid keys from re-verification
  const [invalidServices, setInvalidServices] = useState<Set<string>>(new Set());

  // Re-verify all connected keys on mount
  useEffect(() => {
    if (!apiKeys.length || !user?.tenant_id) return;

    const reverifyAll = async () => {
      const newInvalid = new Set<string>();
      for (const key of apiKeys) {
        if (key.status === "inactive") continue;
        try {
          const result = await verifyMutation.mutateAsync({
            service: key.service,
            reverify: true,
            tenant_id: user.tenant_id,
          });
          if (!result.valid) {
            newInvalid.add(key.service);
          }
        } catch {
          // Silently skip re-verification failures
        }
      }
      if (newInvalid.size > 0) setInvalidServices(newInvalid);
    };

    reverifyAll();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys.length]);

  const connectedMap = new Map<string, ToolApiKey>();
  apiKeys.forEach((k) => connectedMap.set(k.service, k));

  const handleConnect = async () => {
    if (!connectingService || !apiKeyInput.trim()) return;

    setVerifyStep("verifying");
    setVerifyError(null);

    try {
      // Step 1: Verify the key
      const additionalConfig: Record<string, unknown> = {};
      connectingService.extraFields?.forEach((f) => {
        if (extraInputs[f.key]) additionalConfig[f.key] = extraInputs[f.key];
      });

      const result = await verifyMutation.mutateAsync({
        service: connectingService.id,
        api_key: apiKeyInput.trim(),
        additional_config: additionalConfig,
      });

      if (!result.valid) {
        setVerifyStep("error");
        setVerifyError(result.error || "Verification failed. Please check your credentials.");
        return;
      }

      // Step 2: Save the key
      setVerifyStep("success");
      await connectMutation.mutateAsync({
        service: connectingService.id,
        api_key: apiKeyInput.trim(),
        additional_config: additionalConfig,
        display_name: result.account_name || connectingService.label,
      });

      // Remove from invalid set if it was there
      setInvalidServices((prev) => {
        const next = new Set(prev);
        next.delete(connectingService.id);
        return next;
      });

      setTimeout(() => {
        setConnectingService(null);
        setApiKeyInput("");
        setExtraInputs({});
        setVerifyStep("idle");
      }, 1000);
    } catch (err) {
      setVerifyStep("error");
      setVerifyError(err instanceof Error ? err.message : "Verification failed.");
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    await disconnectMutation.mutateAsync({
      id: disconnectTarget.key.id,
      service: disconnectTarget.key.service,
    });
    setDisconnectTarget(null);
  };

  const maskKey = (key: string) => {
    if (key.length <= 4) return "••••";
    return "••••" + key.slice(-4);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-card">
        <span className="text-sm font-medium text-muted-foreground mr-1">API Keys:</span>
        {SERVICES.map((svc) => {
          const connected = connectedMap.get(svc.id);
          const isInvalid = invalidServices.has(svc.id);

          if (connected) {
            return (
              <span
                key={svc.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                  isInvalid
                    ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                }`}
              >
                {isInvalid ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {svc.label}
                <span className="text-[10px] opacity-60 ml-0.5">{maskKey(connected.api_key)}</span>
                <button
                  onClick={() => {
                    if (isInvalid) {
                      // Re-connect flow
                      setConnectingService(svc);
                    } else {
                      setDisconnectTarget({ key: connected, service: svc });
                    }
                  }}
                  className="ml-0.5 hover:text-destructive transition-colors"
                  title={isInvalid ? "Update API Key" : "Disconnect"}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          }
          return (
            <button
              key={svc.id}
              onClick={() => setConnectingService(svc)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-3 w-3" />
              {svc.label}
            </button>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectingService} onOpenChange={(open) => {
        if (!open) {
          setConnectingService(null);
          setApiKeyInput("");
          setExtraInputs({});
          setVerifyStep("idle");
          setVerifyError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {connectingService?.label}</DialogTitle>
            <DialogDescription>
              Paste your API key below. We'll verify it before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Paste your API key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                disabled={verifyStep === "verifying" || verifyStep === "success"}
              />
            </div>
            {connectingService?.extraFields?.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  placeholder={f.help}
                  value={extraInputs[f.key] || ""}
                  onChange={(e) => setExtraInputs({ ...extraInputs, [f.key]: e.target.value })}
                  disabled={verifyStep === "verifying" || verifyStep === "success"}
                />
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}

            {/* Verification status */}
            {verifyStep === "verifying" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying your API key...
              </div>
            )}
            {verifyStep === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Check className="h-4 w-4" />
                Connected successfully!
              </div>
            )}
            {verifyStep === "error" && verifyError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {verifyError}
              </div>
            )}

            {connectingService?.helpUrl && verifyStep !== "success" && (
              <p className="text-xs text-muted-foreground">
                Where to find your API key?{" "}
                <a href={connectingService.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  View instructions →
                </a>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConnectingService(null);
              setVerifyStep("idle");
              setVerifyError(null);
            }} disabled={verifyStep === "verifying"}>
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!apiKeyInput.trim() || verifyStep === "verifying" || verifyStep === "success"}
            >
              {verifyStep === "verifying" ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
              ) : verifyStep === "success" ? (
                <><Check className="h-4 w-4 mr-2" /> Connected!</>
              ) : (
                "Verify & Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget?.service.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your AI agents will no longer be able to use tools connected to {disconnectTarget?.service.label}. Any active tools using this service will be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

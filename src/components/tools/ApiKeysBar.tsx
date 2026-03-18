import { useState, useEffect } from "react";
import { AlertTriangle, Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToolApiKeys, useConnectApiKey, useDisconnectApiKey, useReverifyApiKey, type ToolApiKey } from "@/hooks/use-tools";

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
  const reverifyMutation = useReverifyApiKey();

  const [connectingService, setConnectingService] = useState<typeof SERVICES[0] | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [extraInputs, setExtraInputs] = useState<Record<string, string>>({});
  const [disconnectTarget, setDisconnectTarget] = useState<{ key: ToolApiKey; service: typeof SERVICES[0] } | null>(null);
  const [invalidKeys, setInvalidKeys] = useState<Set<string>>(new Set());

  const connectedMap = new Map<string, ToolApiKey>();
  apiKeys.forEach((k) => connectedMap.set(k.service, k));

  // Re-verify on mount
  useEffect(() => {
    if (apiKeys.length === 0) return;
    const invalid = new Set<string>();
    apiKeys.forEach((k) => {
      if (k.status === "invalid") {
        invalid.add(k.service);
      }
    });
    setInvalidKeys(invalid);

    // Background re-verify active keys
    apiKeys
      .filter((k) => k.status === "active")
      .forEach((k) => {
        reverifyMutation.mutate(
          { service: k.service, key_id: k.id },
          {
            onSuccess: (result) => {
              if (!result.valid) {
                setInvalidKeys((prev) => new Set(prev).add(k.service));
              }
            },
          }
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys.length]);

  const handleConnect = async () => {
    if (!connectingService || !apiKeyInput.trim()) return;
    const additionalConfig: Record<string, unknown> = {};
    connectingService.extraFields?.forEach((f) => {
      if (extraInputs[f.key]) additionalConfig[f.key] = extraInputs[f.key];
    });
    try {
      await connectMutation.mutateAsync({
        service: connectingService.id,
        api_key: apiKeyInput.trim(),
        additional_config: additionalConfig,
        display_name: connectingService.label,
      });
      setInvalidKeys((prev) => {
        const next = new Set(prev);
        next.delete(connectingService.id);
        return next;
      });
      setConnectingService(null);
      setApiKeyInput("");
      setExtraInputs({});
    } catch {
      // Error handled by mutation toast
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    await disconnectMutation.mutateAsync({ id: disconnectTarget.key.id, service: disconnectTarget.key.service });
    setDisconnectTarget(null);
  };

  const maskedKey = (key: string) => {
    if (!key || key.includes(":")) return "••••••••";
    return `••••${key.slice(-4)}`;
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-card">
          <span className="text-sm font-medium text-muted-foreground mr-1">API Keys:</span>
          {SERVICES.map((svc) => {
            const connected = connectedMap.get(svc.id);
            const isInvalid = invalidKeys.has(svc.id);

            if (connected && connected.status !== "inactive") {
              return (
                <span
                  key={svc.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                    isInvalid
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                  }`}
                >
                  {isInvalid ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {svc.label}
                  <button
                    onClick={() => setDisconnectTarget({ key: connected, service: svc })}
                    className="ml-0.5 hover:text-destructive transition-colors"
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

        {/* Invalid key warnings */}
        {Array.from(invalidKeys).map((service) => {
          const svc = SERVICES.find((s) => s.id === service);
          if (!svc) return null;
          return (
            <div key={service} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">{svc.label} — Connection Error</p>
                <p className="text-xs text-muted-foreground">Your API key appears to be invalid or expired. Tools using {svc.label} won't work until you reconnect.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConnectingService(svc)}>Update API Key</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    const key = connectedMap.get(service);
                    if (key) setDisconnectTarget({ key, service: svc });
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect dialog */}
      <Dialog open={!!connectingService} onOpenChange={(open) => !open && setConnectingService(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {connectingService?.label}</DialogTitle>
            <DialogDescription>
              Paste your API key below. It will be validated against the live API before saving.
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
              />
            </div>
            {connectingService?.extraFields?.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  placeholder={f.help}
                  value={extraInputs[f.key] || ""}
                  onChange={(e) => setExtraInputs({ ...extraInputs, [f.key]: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
            {connectingService?.helpUrl && (
              <p className="text-xs text-muted-foreground">
                Where to find your API key?{" "}
                <a href={connectingService.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  View instructions →
                </a>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectingService(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={!apiKeyInput.trim() || connectMutation.isPending}>
              {connectMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect confirmation */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget?.service.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your AI agents will no longer be able to use tools that depend on {disconnectTarget?.service.label}. Active tools using this service will be deactivated.
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

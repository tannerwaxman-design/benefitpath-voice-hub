import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToolApiKeys, useConnectApiKey, useDisconnectApiKey, type ToolApiKey } from "@/hooks/use-tools";

const SERVICES = [
  { id: "ghl", label: "GoHighLevel", helpUrl: "https://highlevel.stoplight.io/docs/integrations/", extraFields: [{ key: "location_id", label: "Location ID", help: "Found in Settings → Business Info in your GHL sub-account" }] },
  { id: "hubspot", label: "HubSpot", helpUrl: "https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key" },
  { id: "google_calendar", label: "Google Calendar", helpUrl: "https://developers.google.com/calendar/api/guides/overview" },
  { id: "salesforce", label: "Salesforce", helpUrl: "https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm" },
  { id: "zapier", label: "Zapier", helpUrl: "https://zapier.com/help/create/basics/get-started-with-zapier" },
  { id: "custom", label: "Custom", helpUrl: "" },
];

export function ApiKeysBar() {
  const { data: apiKeys = [] } = useToolApiKeys();
  const connectMutation = useConnectApiKey();
  const disconnectMutation = useDisconnectApiKey();

  const [connectingService, setConnectingService] = useState<typeof SERVICES[0] | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [extraInputs, setExtraInputs] = useState<Record<string, string>>({});

  const connectedMap = new Map<string, ToolApiKey>();
  apiKeys.forEach((k) => connectedMap.set(k.service, k));

  const handleConnect = async () => {
    if (!connectingService || !apiKeyInput.trim()) return;
    const additionalConfig: Record<string, unknown> = {};
    connectingService.extraFields?.forEach((f) => {
      if (extraInputs[f.key]) additionalConfig[f.key] = extraInputs[f.key];
    });
    await connectMutation.mutateAsync({
      service: connectingService.id,
      api_key: apiKeyInput.trim(),
      additional_config: additionalConfig,
      display_name: connectingService.label,
    });
    setConnectingService(null);
    setApiKeyInput("");
    setExtraInputs({});
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-card">
        <span className="text-sm font-medium text-muted-foreground mr-1">API Keys:</span>
        {SERVICES.map((svc) => {
          const connected = connectedMap.get(svc.id);
          if (connected) {
            return (
              <span key={svc.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                <Check className="h-3 w-3" />
                {svc.label}
                <button
                  onClick={() => disconnectMutation.mutate(connected.id)}
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

      <Dialog open={!!connectingService} onOpenChange={(open) => !open && setConnectingService(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {connectingService?.label}</DialogTitle>
            <DialogDescription>
              Paste your API key below. This lets your AI agent interact with your {connectingService?.label} account.
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
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

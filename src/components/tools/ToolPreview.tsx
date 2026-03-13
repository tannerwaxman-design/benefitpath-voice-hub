import { ClipboardList } from "lucide-react";
import type { ToolParameter } from "@/hooks/use-tools";

interface ToolPreviewProps {
  name: string;
  service: string;
  messageStart: string;
  messageComplete: string;
  messageFailed: string;
  parameters: ToolParameter[];
  serviceConfig: Record<string, unknown>;
}

const SERVICE_LABELS: Record<string, string> = {
  ghl: "GoHighLevel",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  google_calendar: "Google Calendar",
  custom_webhook: "Custom Webhook",
  custom: "Custom",
};

export function ToolPreview({ name, service, messageStart, messageComplete, messageFailed, parameters, serviceConfig }: ToolPreviewProps) {
  const enabledParams = parameters.filter((p) => p.enabled);
  const serviceName = SERVICE_LABELS[service] || service;

  return (
    <div className="rounded-lg border bg-muted/30 p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ClipboardList className="h-4 w-4" />
        PREVIEW
      </div>
      <p className="text-sm text-muted-foreground">
        During a call, when the situation matches "{name || "this tool"}", the AI will:
      </p>
      <ol className="text-sm space-y-2 list-decimal list-inside">
        {messageStart && (
          <li>
            Say: <span className="italic text-muted-foreground">"{messageStart}"</span>
          </li>
        )}
        {enabledParams.length > 0 && (
          <li>
            Collect: {enabledParams.map((p) => p.label).join(", ")}
          </li>
        )}
        <li>
          Send data to <strong>{serviceName}</strong>
          {serviceConfig.calendar_id && ` (Calendar: "${serviceConfig.calendar_id}")`}
          {serviceConfig.duration_minutes && `, Duration: ${serviceConfig.duration_minutes} min`}
          {serviceConfig.url && ` → ${(serviceConfig.url as string).substring(0, 40)}...`}
        </li>
        {messageComplete && (
          <li>
            Say: <span className="italic text-muted-foreground">"{messageComplete}"</span>
          </li>
        )}
      </ol>
      {messageFailed && (
        <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
          If it fails, the AI will say: <span className="italic">"{messageFailed}"</span>
        </p>
      )}
    </div>
  );
}

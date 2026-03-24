import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface SoaStatusCardProps {
  soaCollected: boolean;
  soaConsentGiven: boolean | null;
  soaTimestampSeconds: number | null;
  soaResponseText: string | null;
  soaPlanTypes: string[] | null;
  agentSoaEnabled: boolean;
}

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function SoaStatusCard({
  soaCollected,
  soaConsentGiven,
  soaTimestampSeconds,
  soaResponseText,
  soaPlanTypes,
  agentSoaEnabled,
}: SoaStatusCardProps) {
  if (!agentSoaEnabled) return null;

  if (soaCollected && soaConsentGiven) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0" />
            <span className="text-sm font-semibold text-success">
              SOA Confirmed{soaTimestampSeconds != null ? ` at ${formatTimestamp(soaTimestampSeconds)} into the call` : ""}
            </span>
          </div>
          {soaResponseText && (
            <p className="text-xs text-muted-foreground ml-6">
              Caller said: "{soaResponseText}"
            </p>
          )}
          {soaPlanTypes && soaPlanTypes.length > 0 && (
            <p className="text-xs text-muted-foreground ml-6">
              Plan types: {soaPlanTypes.map(p => p.split("(")[0].trim()).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (soaCollected && soaConsentGiven === false) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4.5 w-4.5 text-destructive shrink-0" />
            <span className="text-sm font-semibold text-destructive">
              SOA Declined{soaTimestampSeconds != null ? ` at ${formatTimestamp(soaTimestampSeconds)} into the call` : ""}
            </span>
          </div>
          {soaResponseText && (
            <p className="text-xs text-muted-foreground ml-6">
              Caller said: "{soaResponseText}"
            </p>
          )}
          <p className="text-xs text-muted-foreground ml-6">
            No plan-specific information was discussed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // SOA not collected — compliance issue
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-warning shrink-0" />
          <span className="text-sm font-semibold text-warning">
            SOA Not Collected — Review Required
          </span>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          This agent has SOA enabled but consent was not collected during this call. This may be a compliance issue.
        </p>
      </CardContent>
    </Card>
  );
}

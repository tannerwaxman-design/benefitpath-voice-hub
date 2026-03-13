import { useState } from "react";
import { usePhoneNumbers, useProvisionPhoneNumber } from "@/hooks/use-phone-numbers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, MoreVertical, Plus, ShieldCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const spamColors: Record<string, { bg: string; label: string }> = {
  clean: { bg: "bg-success", label: "Clean" },
  "some-flags": { bg: "bg-warning", label: "Some Flags" },
  flagged: { bg: "bg-destructive", label: "Flagged" },
};

export default function PhoneNumbers() {
  const { toast } = useToast();
  const { data: phoneNumbers, isLoading } = usePhoneNumbers();
  const provisionNumber = useProvisionPhoneNumber();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState<"local" | "toll_free">("local");
  const [areaCode, setAreaCode] = useState("720");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Phone Numbers</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeNumbers = phoneNumbers?.filter(pn => pn.status === "active") || [];
  const totalCost = phoneNumbers?.reduce((sum, pn) => sum + (pn.monthly_cost || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Phone Numbers</h1>
        <Button onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4 mr-2" /> Get New Number</Button>
      </div>

      {(!phoneNumbers || phoneNumbers.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No phone numbers yet</p>
            <p className="text-sm text-muted-foreground mb-4">Provision a phone number to start making calls.</p>
            <Button onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4 mr-2" /> Get Number</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {["Phone Number", "Friendly Name", "Type", "Status", "Assigned Agent", "Spam Score", "STIR/SHAKEN", "Cost"].map(h => (
                      <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phoneNumbers.map((pn, i) => (
                    <tr key={pn.id} className={`border-t hover:bg-secondary/20 ${i % 2 ? "bg-secondary/10" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">{pn.phone_number}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{pn.friendly_name || "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{pn.number_type}</Badge></td>
                      <td className="px-4 py-3"><Badge variant="secondary" className={`${statusColors[pn.status] || ""} border-0 text-[10px]`}>{pn.status}</Badge></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(pn as any).agents?.agent_name || "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${spamColors[pn.spam_score || "clean"]?.bg || ""}`} />
                          <span className="text-xs text-muted-foreground">{spamColors[pn.spam_score || "clean"]?.label || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className={`h-3.5 w-3.5 ${pn.stir_shaken_status === "full_attestation" ? "text-success" : pn.stir_shaken_status === "partial" ? "text-warning" : "text-muted-foreground"}`} />
                          <span className="text-xs text-muted-foreground">{pn.stir_shaken_status?.replace("_", " ") || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">${pn.monthly_cost.toFixed(2)}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="card-title">Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-foreground">{activeNumbers.length}</p>
                  <p className="text-xs text-muted-foreground">Active Numbers</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-success">{activeNumbers.filter(pn => pn.cnam_registered).length}</p>
                  <p className="text-xs text-muted-foreground">CNAM Registered</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* New Number Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Get New Number</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Choose type:</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {(["local", "toll_free"] as const).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${newType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <p className="font-medium text-foreground capitalize">{t.replace("_", "-")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t === "local" ? "$1.50/mo" : "$3.00/mo"}</p>
                    {newType === t && <Check className="h-4 w-4 text-primary mx-auto mt-2" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Area Code</Label>
              <Input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="e.g., 555" className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => {
              provisionNumber.mutate({ area_code: areaCode, number_type: newType }, {
                onSuccess: () => setShowNewModal(false),
              });
            }} disabled={provisionNumber.isPending}>
              {provisionNumber.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Provision Number
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

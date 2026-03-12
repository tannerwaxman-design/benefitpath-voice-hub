import { useState } from "react";
import { phoneNumbers } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, MoreVertical, Plus, ShieldCheck } from "lucide-react";

// ============================================
// TODO: VAPI INTEGRATION
// Endpoint: POST /phone-number, GET /phone-number
// Purpose: Provision and manage phone numbers via VAPI/Twilio
// Docs: https://docs.vapi.ai/api-reference/phone-numbers
// ============================================

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  "Failed Verification": "bg-destructive/10 text-destructive",
};

const spamColors: Record<string, { bg: string; label: string }> = {
  clean: { bg: "bg-success", label: "Clean" },
  "some-flags": { bg: "bg-warning", label: "Some Flags" },
  flagged: { bg: "bg-destructive", label: "Flagged" },
};

export default function PhoneNumbers() {
  const { toast } = useToast();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState(0);
  const [newType, setNewType] = useState<"Local" | "Toll-Free">("Local");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Phone Numbers</h1>
        <Button onClick={() => { setShowNewModal(true); setNewStep(0); }}><Plus className="h-4 w-4 mr-2" /> Get New Number</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["Phone Number", "Friendly Name", "Type", "Status", "Assigned To", "Spam Score", "STIR/SHAKEN", "Cost", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((pn, i) => (
                <tr key={pn.id} className={`border-t hover:bg-secondary/20 ${i % 2 ? "bg-secondary/10" : ""}`}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">{pn.number}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{pn.friendlyName}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{pn.type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={`${statusColors[pn.status]} border-0 text-[10px]`}>{pn.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{pn.assignedTo || "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${spamColors[pn.spamScore].bg}`} />
                      <span className="text-xs text-muted-foreground">{spamColors[pn.spamScore].label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className={`h-3.5 w-3.5 ${pn.stirShaken === "Full Attestation" ? "text-success" : pn.stirShaken === "Partial" ? "text-warning" : "text-muted-foreground"}`} />
                      <span className="text-xs text-muted-foreground">{pn.stirShaken}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{pn.monthlyCost}</td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded hover:bg-secondary"><MoreVertical className="h-4 w-4 text-muted-foreground" /></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => toast({ title: "Edit number" })}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "CNAM registration started" })}>Register CNAM</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "Set as default" })}>Set as Default</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => toast({ title: "Number released", variant: "destructive" })}>Release</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Caller ID Info */}
      <Card>
        <CardHeader><CardTitle className="card-title">Caller ID & Reputation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Maintaining a clean caller ID reputation is crucial for connect rates. Register your business name (CNAM) and ensure STIR/SHAKEN attestation for all numbers.</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Active Numbers</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-2xl font-bold text-success">2</p>
              <p className="text-xs text-muted-foreground">Full Attestation</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-center">
              <p className="text-2xl font-bold text-foreground">$7.50</p>
              <p className="text-xs text-muted-foreground">Monthly Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Number Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Get New Number</DialogTitle></DialogHeader>
          {newStep === 0 && (
            <div className="space-y-4">
              <Label>Choose type:</Label>
              <div className="grid grid-cols-2 gap-4">
                {(["Local", "Toll-Free"] as const).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${newType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <p className="font-medium text-foreground">{t}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t === "Local" ? "$1.50/mo" : "$3.00/mo"}</p>
                    {newType === t && <Check className="h-4 w-4 text-primary mx-auto mt-2" />}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={() => setNewStep(1)}>Next</Button>
            </div>
          )}
          {newStep === 1 && (
            <div className="space-y-4">
              <Label>Enter desired area code:</Label>
              <Input placeholder="e.g., 555" defaultValue="555" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Available numbers:</p>
                {["(555) 345-6789", "(555) 456-7891", "(555) 567-8902"].map(n => (
                  <button key={n} className="w-full p-3 rounded-lg border hover:border-primary text-left flex items-center justify-between" onClick={() => setNewStep(2)}>
                    <span className="font-mono text-sm text-foreground">{n}</span>
                    <span className="text-xs text-primary">Select</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {newStep === 2 && (
            <div className="space-y-4 text-center">
              <p className="text-foreground">Add <strong className="font-mono">(555) 345-6789</strong> for <strong>{newType === "Local" ? "$1.50" : "$3.00"}/month</strong>?</p>
              <Button className="w-full" onClick={() => { toast({ title: "Number provisioned!" }); setShowNewModal(false); }}>Confirm</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

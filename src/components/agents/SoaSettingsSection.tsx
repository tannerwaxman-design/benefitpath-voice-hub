import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const ALL_PLAN_TYPES = [
  "Medicare Advantage (MA) plans, including HMO, PPO, and PFFS",
  "Medicare Supplement (Medigap) plans",
  "Medicare Prescription Drug Plans (Part D / PDP)",
  "Dental, Vision, and Hearing (DSNP)",
  "Hospital Indemnity plans",
  "Final Expense / Burial Insurance",
];

const SOA_TIMING_OPTIONS = [
  { value: "after_greeting", label: "After greeting and identity verification, before discussing any plans" },
  { value: "end_of_call", label: "At the end of the call before booking the appointment" },
  { value: "on_interest", label: "Only if the lead expresses interest in specific plans" },
];

export interface SoaConfig {
  soa_enabled: boolean;
  soa_script: string;
  soa_plan_types: string[];
  soa_timing: string;
}

interface SoaSettingsSectionProps {
  config: SoaConfig;
  onChange: (config: SoaConfig) => void;
}

export function SoaSettingsSection({ config, onChange }: SoaSettingsSectionProps) {
  const update = (partial: Partial<SoaConfig>) => onChange({ ...config, ...partial });

  const togglePlanType = (plan: string) => {
    const current = config.soa_plan_types || [];
    const updated = current.includes(plan)
      ? current.filter((p) => p !== plan)
      : [...current, plan];
    update({ soa_plan_types: updated });
  };

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Scope of Appointment (SOA)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">CMS-required consent for Medicare plan discussions</p>
        </div>
        <Badge variant="outline" className="text-[10px]">Medicare Only</Badge>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={config.soa_enabled} onCheckedChange={(v) => update({ soa_enabled: v })} />
        <Label>Collect verbal SOA consent during calls</Label>
      </div>

      {config.soa_enabled && (
        <div className="space-y-5 ml-1 pl-4 border-l-2 border-primary/20">
          <div>
            <Label className="text-xs font-medium">SOA Script (CMS-compliant language)</Label>
            <Textarea
              value={config.soa_script}
              onChange={(e) => update({ soa_script: e.target.value })}
              rows={5}
              className="mt-1.5 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">[SELECTED_PLAN_TYPES]</code> to insert the selected plan types.
            </p>
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">Plan types to include in SOA</Label>
            <div className="space-y-2">
              {ALL_PLAN_TYPES.map((plan) => (
                <div key={plan} className="flex items-center gap-2">
                  <Checkbox
                    checked={(config.soa_plan_types || []).includes(plan)}
                    onCheckedChange={() => togglePlanType(plan)}
                  />
                  <span className="text-xs text-foreground">{plan}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-2 block">When to collect SOA</Label>
            <div className="space-y-2">
              {SOA_TIMING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ soa_timing: opt.value })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-xs transition-all ${
                    config.soa_timing === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                    config.soa_timing === opt.value ? "border-primary bg-primary" : "border-muted-foreground"
                  }`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-xs font-medium text-foreground">If consent is given:</p>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li>✅ Record the exact timestamp of verbal consent</li>
              <li>✅ Mark the call record as "SOA Collected"</li>
              <li>✅ Store which plan types were consented to</li>
              <li>✅ Continue the conversation and discuss plans normally</li>
            </ul>
            <p className="text-xs font-medium text-foreground mt-3">If consent is NOT given:</p>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li>⚠️ Do NOT discuss specific plan types or carriers</li>
              <li>📋 Offer to email general Medicare information instead</li>
              <li>📞 Offer to schedule a follow-up after they review a written SOA</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

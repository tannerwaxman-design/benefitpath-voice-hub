import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBillingUsage, useUpdateBillingSettings } from "@/hooks/use-billing";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PLANS, getPlanByProductId } from "@/lib/stripe-config";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Clock, TrendingUp, DollarSign, Download, Check, Star, Zap, Building2, Crown, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

const planNames: Record<string, string> = {
  voice_ai_starter: "Starter",
  voice_ai_pro: "Professional",
  voice_ai_enterprise: "Agency",
};

const planPrices: Record<string, number> = {
  voice_ai_starter: 49,
  voice_ai_pro: 149,
  voice_ai_enterprise: 349,
};

const planLimits: Record<string, number> = {
  voice_ai_starter: 1000,
  voice_ai_pro: 5000,
  voice_ai_enterprise: 15000,
};

const invoices = [
  { date: "Mar 1, 2026", description: "Professional — Monthly", amount: 149.0, status: "Paid" },
  { date: "Feb 1, 2026", description: "Professional — Monthly", amount: 149.0, status: "Paid" },
  { date: "Feb 1, 2026", description: "Overage — 312 credits", amount: 15.6, status: "Paid" },
  { date: "Jan 1, 2026", description: "Professional — Monthly", amount: 149.0, status: "Paid" },
];

const plans = [
  {
    id: "voice_ai_starter",
    name: "Starter",
    price: 49,
    icon: Zap,
    tagline: "Best for solo agents getting started",
    features: [
      "1,000 credits included",
      "1 AI agent",
      "Outbound calls only",
      "Basic call logs (no transcripts)",
      "CSV contact upload",
      "Email support",
    ],
  },
  {
    id: "voice_ai_pro",
    name: "Professional",
    price: 149,
    icon: Star,
    popular: true,
    tagline: "Best for active agents and small teams",
    features: [
      "5,000 credits included",
      "Unlimited AI agents",
      "Outbound + inbound calls",
      "Full transcripts & recordings",
      "AI call scoring",
      "Knowledge base",
      "CRM & calendar integrations (Tools)",
      "Smart scheduling",
      "Priority email & chat support",
    ],
  },
  {
    id: "voice_ai_enterprise",
    name: "Agency",
    price: 349,
    icon: Building2,
    tagline: "Best for agencies managing multiple agents",
    features: [
      "15,000 credits included",
      "Everything in Professional",
      "Voice cloning",
      "AI objection trainer",
      "Multi-language support (Spanish)",
      "Team management (up to 10 users)",
      "White-label reports",
      "Dedicated account manager",
      "Phone & video support",
    ],
  },
  {
    id: "voice_ai_custom",
    name: "Enterprise",
    price: -1,
    icon: Crown,
    tagline: "Contact us for a custom quote",
    features: [
      "Unlimited credits",
      "Everything in Agency",
      "Unlimited team members",
      "Custom AI model training",
      "API access",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

export default function BillingUsage() {
  const { user } = useAuth();
  const { data: billing, isLoading } = useBillingUsage();
  const updateSettings = useUpdateBillingSettings();
  const { toast } = useToast();
  const subscription = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const tenant = billing?.tenant || user?.tenant;
  const plan = tenant?.plan || "voice_ai_pro";
  const creditLimit = tenant?.monthly_minute_limit ?? 5000;
  const creditsUsed = tenant?.minutes_used_this_cycle ?? 0;
  const usagePercent = creditLimit > 0 ? (creditsUsed / creditLimit) * 100 : 0;
  const overageRate = tenant?.overage_rate_per_minute ?? 0.05;
  const cycleStart = tenant?.billing_cycle_start;
  const cycleEnd = tenant?.billing_cycle_end;
  const price = planPrices[plan] ?? 149;

  const [alert80, setAlert80] = useState(true);
  const [alert100, setAlert100] = useState(true);
  const hardStop = tenant?.hard_stop_enabled ?? false;
  const alertEmail = user?.email ?? "";

  const daysInCycle = cycleStart && cycleEnd
    ? Math.max(1, Math.ceil((new Date(cycleEnd).getTime() - new Date(cycleStart).getTime()) / 86400000))
    : 30;
  const daysPassed = cycleStart
    ? Math.max(1, Math.ceil((Date.now() - new Date(cycleStart).getTime()) / 86400000))
    : 1;
  const projectedUsage = Math.round((creditsUsed / daysPassed) * daysInCycle);

  const dailyData = billing?.usageHistory?.map(h => ({
    name: h.month,
    credits: h.minutes,
  })) || [];

  const dailyAvgTarget = creditLimit / daysInCycle;

  const outboundCredits = Math.round(creditsUsed * 0.847);
  const voicemailCredits = Math.round(creditsUsed * 0.105);
  const transferCredits = creditsUsed - outboundCredits - voicemailCredits;

  const costSummary = billing?.costSummary;
  const totalCost = costSummary?.withMargin ?? price;

  const progressColor = usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500";

  const formatDate = (d: string | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleHardStopToggle = (checked: boolean) => {
    updateSettings.mutate({ hard_stop_enabled: checked });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan, monitor credit usage, and view invoices.</p>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">Your Plan: {planNames[plan] || plan}</h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">${price}/mo</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Billing cycle: {formatDate(cycleStart)} – {formatDate(cycleEnd)}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits Used</span>
                  <span className="font-medium text-foreground">{creditsUsed.toLocaleString()} / {creditLimit.toLocaleString()}</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor}`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% of monthly credits • {(creditLimit - creditsUsed).toLocaleString()} remaining</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground">
                <span>Projected usage this cycle: ~{projectedUsage.toLocaleString()} credits</span>
                <span className="hidden sm:inline">•</span>
                <span>Overage rate: ${overageRate.toFixed(2)}/credit beyond {creditLimit.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="default" size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
                Upgrade Plan
              </Button>
              <Button variant="outline" size="sm">Manage Payment</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credits Today</p>
              <p className="text-lg font-bold text-foreground">{Math.round(creditsUsed / Math.max(daysPassed, 1))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credits This Week</p>
              <p className="text-lg font-bold text-foreground">{Math.round((creditsUsed / Math.max(daysPassed, 1)) * 7)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost This Cycle</p>
              <p className="text-lg font-bold text-foreground">${totalCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Usage Over Time</CardTitle>
          <CardDescription>Monthly credit consumption breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <ReferenceLine y={dailyAvgTarget} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Avg target", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Bar dataKey="credits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No usage data available yet.</p>
          )}

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Outbound calls</TableCell>
                  <TableCell className="text-right">{outboundCredits.toLocaleString()}</TableCell>
                  <TableCell className="text-right">84.7%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Voicemail messages</TableCell>
                  <TableCell className="text-right">{voicemailCredits.toLocaleString()}</TableCell>
                  <TableCell className="text-right">10.5%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Transfer bridge time</TableCell>
                  <TableCell className="text-right">{transferCredits.toLocaleString()}</TableCell>
                  <TableCell className="text-right">4.8%</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{creditsUsed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div id="plans-section">
        <h2 className="text-lg font-semibold text-foreground mb-4">Compare Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(p => {
            const isCurrent = p.id === plan;
            return (
              <Card key={p.id} className={`relative ${p.popular && !isCurrent ? "border-primary shadow-md" : ""} ${isCurrent ? "border-primary/50 bg-primary/5" : ""}`}>
                {p.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="outline" className="border-primary text-primary bg-background">Current Plan</Badge>
                  </div>
                )}
                <CardContent className="p-6 pt-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <p.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                  </div>
                  <div>
                    {p.price === -1 ? (
                      <span className="text-2xl font-bold text-foreground">Custom Pricing</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">${p.price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground italic">{p.tagline}</p>
                  <ul className="space-y-2">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    className="w-full"
                    disabled={isCurrent}
                  >
                    {isCurrent ? "Current Plan" : p.id === "voice_ai_custom" ? "Contact Sales" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                  <TableCell>{inv.description}</TableCell>
                  <TableCell className="text-right font-medium">${inv.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Alerts</CardTitle>
          <CardDescription>Configure notifications for your credit usage thresholds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Email me when I hit 80% of my monthly credits</Label>
            <Switch checked={alert80} onCheckedChange={setAlert80} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Email me when I hit 100% (start of overage)</Label>
            <Switch checked={alert100} onCheckedChange={setAlert100} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Hard stop — pause all campaigns when I hit my credit limit</Label>
              <p className="text-xs text-muted-foreground mt-0.5">No overage charges will be incurred</p>
            </div>
            <Switch checked={hardStop} onCheckedChange={handleHardStopToggle} />
          </div>
          <div className="pt-2 border-t border-border">
            <Label className="text-sm text-muted-foreground">Alert email</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={alertEmail} readOnly className="max-w-xs" />
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
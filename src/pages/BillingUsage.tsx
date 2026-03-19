import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBillingUsage, useUpdateBillingSettings } from "@/hooks/use-billing";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PLANS, CREDIT_PACKAGES, getPlanByProductId } from "@/lib/stripe-config";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, TrendingUp, DollarSign, Download, Check, Star, Zap, Building2, Crown, Loader2, Coins, RefreshCw, AlertTriangle, XCircle, TrendingDown, Clock, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const planFeatures: Record<string, string[]> = {
  voice_ai_starter: [
    "1 AI agent",
    "Outbound calls only",
    "Basic call logs (no transcripts)",
    "CSV contact upload",
    "1 campaign at a time",
    "Email support",
  ],
  voice_ai_pro: [
    "Unlimited AI agents",
    "Outbound + inbound calls",
    "Full transcripts & recordings",
    "AI call summaries & sentiment",
    "Knowledge base",
    "Smart scheduling",
    "CRM & calendar tools",
    "Unlimited campaigns",
    "Priority support",
  ],
  voice_ai_enterprise: [
    "Everything in Professional",
    "Voice cloning",
    "AI call scoring",
    "AI objection trainer",
    "Multi-language (Spanish)",
    "Team management (up to 10)",
    "Call coaching & review",
    "Dedicated account manager",
    "Phone & video support",
  ],
};

const plans = [
  { id: "voice_ai_starter", name: "Starter", price: 29, icon: Zap, tagline: "Perfect for solo agents testing the waters" },
  { id: "voice_ai_pro", name: "Professional", price: 79, icon: Star, popular: true, tagline: "The go-to plan for serious agents" },
  { id: "voice_ai_enterprise", name: "Agency", price: 199, icon: Building2, tagline: "Built for agencies that want every advantage" },
  { id: "voice_ai_custom", name: "Enterprise", price: -1, icon: Crown, tagline: "For large operations with custom needs" },
];

const PLAN_ORDER = ["voice_ai_starter", "voice_ai_pro", "voice_ai_enterprise", "voice_ai_custom"];

function isPlanDowngrade(from: string, to: string) {
  return PLAN_ORDER.indexOf(to) < PLAN_ORDER.indexOf(from);
}

export default function BillingUsage() {
  const { user, refreshProfile } = useAuth();
  const { data: billing, isLoading } = useBillingUsage();
  const updateSettings = useUpdateBillingSettings();
  const { toast } = useToast();
  const subscription = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<string | null>(null);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() =>
    sessionStorage.getItem("trial_banner_dismissed") === "1"
  );

  const tenant = billing?.tenant || user?.tenant;
  const plan = tenant?.plan || "voice_ai_starter";
  const creditBalance = tenant?.credit_balance ?? 0;
  const autoRefillEnabled = tenant?.auto_refill_enabled ?? false;
  const autoRefillThreshold = tenant?.auto_refill_threshold ?? 100;
  const autoRefillPackage = tenant?.auto_refill_package ?? "1000";

  // Minutes quota
  const minutesUsed = tenant?.minutes_used_this_cycle ?? 0;
  const minuteLimit = tenant?.monthly_minute_limit ?? 5000;
  const overageRate = tenant?.overage_rate_per_minute ?? 0.05;
  const hardStopEnabled = tenant?.hard_stop_enabled ?? false;
  const minutePct = minuteLimit > 0 ? Math.min((minutesUsed / minuteLimit) * 100, 100) : 0;
  const isOverLimit = minutesUsed > minuteLimit;

  // Trial
  const trialEndsAt = tenant?.trial_ends_at ?? null;
  const tenantStatus = tenant?.status ?? "active";
  const isOnTrial = tenantStatus === "trial" || (trialEndsAt != null && new Date(trialEndsAt) > new Date());
  const trialExpired = tenantStatus === "trial" && trialEndsAt != null && new Date(trialEndsAt) <= new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const totalSpent = billing?.costSummary?.withMargin ?? (billing?.tenant as any)?.total_cost_this_cycle ?? 0;
  const totalMinutes = billing?.costSummary?.totalMinutes ?? 0;
  const cycleStart = tenant?.billing_cycle_start;
  const daysPassed = cycleStart ? Math.max(1, Math.ceil((Date.now() - new Date(cycleStart).getTime()) / 86400000)) : 1;
  const dailyAvg = totalSpent / daysPassed;
  const daysRemaining = dailyAvg > 0 ? Math.round(creditBalance / dailyAvg) : 999;

  const currentPlanConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
  const currentPrice = currentPlanConfig?.price ?? 29;

  const dailyData = billing?.usageHistory?.map(h => ({ name: h.day, spend: h.cost })) || [];

  // Actual cost breakdown
  const vapiCost = billing?.costSummary?.vapi ?? 0;
  const sttCost = billing?.costSummary?.stt ?? 0;
  const llmCost = billing?.costSummary?.llm ?? 0;
  const ttsCost = billing?.costSummary?.tts ?? 0;
  const transportCost = billing?.costSummary?.transport ?? 0;

  // Check URL for purchase success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "success") {
      toast({ title: "Credits purchased successfully!" });
      refreshProfile();
      window.history.replaceState({}, "", "/billing");
    }
    if (params.get("checkout") === "success") {
      toast({ title: "Subscription activated!" });
      refreshProfile();
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  // Fallback: create a brand-new Stripe Checkout session (for new subscribers)
  const handleLegacyCheckout = async (planId: string) => {
    const stripePlan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId: stripePlan.price_id },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  // Primary plan change handler: uses change-plan edge function, falls back to checkout
  const handleChangePlan = async (planId: string) => {
    if (planId === "voice_ai_custom") {
      window.open("mailto:sales@benefitpath.com?subject=Enterprise%20Plan%20Inquiry", "_blank");
      return;
    }
    if (isPlanDowngrade(plan, planId)) {
      setPendingDowngradePlan(planId);
      return;
    }
    await executePlanChange(planId);
  };

  const executePlanChange = async (planId: string) => {
    const stripePlan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return;
    setPendingDowngradePlan(null);
    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { priceId: stripePlan.price_id, planId },
      });
      if (error) throw error;
      if (data?.action === "checkout") {
        await handleLegacyCheckout(planId);
      } else if (data?.success) {
        await refreshProfile();
        toast({
          title: data.direction === "downgrade" ? "Plan downgraded" : "Plan upgraded",
          description: data.direction === "downgrade"
            ? `Your plan has been changed to ${plans.find(p => p.id === planId)?.name}.`
            : `Welcome to ${plans.find(p => p.id === planId)?.name}!`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ title: "Plan change failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleBuyCredits = async (priceId: string, pkgId: string) => {
    setCreditLoading(pkgId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    } finally {
      setCreditLoading(null);
    }
  };

  const handleManagePayment = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Could not open billing portal", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleAutoRefillToggle = (checked: boolean) => {
    updateSettings.mutate({ auto_refill_enabled: checked } as any);
  };

  const handleAutoRefillThreshold = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      updateSettings.mutate({ auto_refill_threshold: num } as any);
    }
  };

  const handleAutoRefillPackage = (val: string) => {
    updateSettings.mutate({ auto_refill_package: val } as any);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const balanceStatus = creditBalance === 0 ? "zero" : creditBalance < 200 ? "low" : "ok";

  // Features lost when downgrading to `pendingDowngradePlan`
  const downgradeLostFeatures = pendingDowngradePlan
    ? (planFeatures[plan] || []).filter(f => !(planFeatures[pendingDowngradePlan] || []).includes(f))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan, buy credits, and track usage.</p>
      </div>

      {/* Trial banner */}
      {(isOnTrial || trialExpired) && (
        trialExpired ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/5 px-4 py-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium flex-1">
              Your free trial has ended. Upgrade to a paid plan to keep all your features and data.
            </p>
            <Button size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
              Upgrade Now
            </Button>
          </div>
        ) : !trialBannerDismissed ? (
          <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <span className="font-semibold">Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining.</span>{" "}
              Upgrade now to keep all features after your trial ends.
            </p>
            <Button size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
              Upgrade
            </Button>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                sessionStorage.setItem("trial_banner_dismissed", "1");
                setTrialBannerDismissed(true);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null
      )}

      {/* Downgrade confirmation dialog */}
      <Dialog open={!!pendingDowngradePlan} onOpenChange={() => setPendingDowngradePlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plan Downgrade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You're switching from <strong>{plans.find(p => p.id === plan)?.name}</strong> to{" "}
              <strong>{plans.find(p => p.id === pendingDowngradePlan)?.name}</strong>. You'll lose access to:
            </p>
            {downgradeLostFeatures.length > 0 ? (
              <ul className="space-y-1">
                {downgradeLostFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No feature changes noted.</p>
            )}
            <p className="text-xs">The change takes effect immediately and a prorated adjustment will be applied to your next invoice.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingDowngradePlan(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={checkoutLoading === pendingDowngradePlan}
              onClick={() => pendingDowngradePlan && executePlanChange(pendingDowngradePlan)}
            >
              {checkoutLoading === pendingDowngradePlan ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…</> : "Confirm Downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section 1: Credit Balance */}
      <Card className={
        balanceStatus === "zero" ? "border-destructive bg-destructive/5" :
        balanceStatus === "low" ? "border-amber-500 bg-amber-500/5" :
        "border-primary/20"
      }>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {balanceStatus === "zero" && <XCircle className="h-5 w-5 text-destructive" />}
                {balanceStatus === "low" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                {balanceStatus === "ok" && <Coins className="h-5 w-5 text-primary" />}
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {balanceStatus === "zero" ? "No Balance" : balanceStatus === "low" ? "Low Balance" : "Your Balance"}
                </h2>
              </div>
              <p className="text-4xl font-bold text-foreground">
                ${creditBalance.toFixed(2)} <span className="text-lg font-normal text-muted-foreground">remaining</span>
              </p>
              {balanceStatus === "zero" ? (
                <p className="text-sm text-destructive">All calling is paused. Add funds to resume.</p>
              ) : balanceStatus === "low" ? (
                <p className="text-sm text-amber-600">
                  At your current usage (~${dailyAvg.toFixed(2)}/day), you'll run out in ~{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
                  Active campaigns will pause when balance hits $0.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  At your current usage (~${dailyAvg.toFixed(2)}/day), your balance will last approximately {daysRemaining} more days.
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button onClick={() => document.getElementById("buy-credits")?.scrollIntoView({ behavior: "smooth" })}>
                {balanceStatus === "zero" || balanceStatus === "low" ? "Add Funds" : "Add Funds"}
              </Button>
              {autoRefillEnabled && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3" /> Auto-refill ON
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Your Plan */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Your Plan: {plans.find(p => p.id === plan)?.name || plan}
                </h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">${currentPrice}/mo</Badge>
              </div>
              {tenant?.billing_cycle_end && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next billing date: {new Date(tenant.billing_cycle_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
                Change Plan
              </Button>
              <Button variant="outline" size="sm" onClick={handleManagePayment} disabled={portalLoading}>
                {portalLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Loading…</> : "Manage Payment Method"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2b: Minute Quota & Overage */}
      <Card className={isOverLimit ? "border-destructive" : minutePct >= 75 ? "border-amber-500" : ""}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Minutes This Cycle</h2>
              <p className="text-2xl font-bold text-foreground mt-1">
                {minutesUsed.toLocaleString()}{" "}
                <span className="text-base font-normal text-muted-foreground">/ {minuteLimit.toLocaleString()} min</span>
              </p>
            </div>
            <Badge
              variant={isOverLimit ? "destructive" : minutePct >= 75 ? "outline" : "secondary"}
              className={minutePct >= 75 && !isOverLimit ? "border-amber-500 text-amber-600" : ""}
            >
              {minutePct.toFixed(1)}% used
            </Badge>
          </div>

          <Progress
            value={minutePct}
            className={`h-2 ${isOverLimit ? "[&>div]:bg-destructive" : minutePct >= 75 ? "[&>div]:bg-amber-500" : ""}`}
          />

          {isOverLimit ? (
            hardStopEnabled ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                Calling is paused — you've reached your monthly limit. Upgrade your plan or wait for the next cycle.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Over limit — extra calls are billed at <strong>${overageRate.toFixed(2)}/min</strong>.{" "}
                <button
                  className="underline"
                  onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Upgrade for more minutes
                </button>
              </div>
            )
          ) : minutePct >= 75 ? (
            <p className="text-sm text-amber-600">
              You've used {minutePct.toFixed(0)}% of your monthly minutes.{" "}
              <button
                className="underline"
                onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Upgrade for more
              </button>
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Overage rate: <span className="font-medium text-foreground">${overageRate.toFixed(2)}/min</span>
              {hardStopEnabled && <span className="ml-2 text-xs">(hard stop enabled)</span>}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="hard-stop-toggle" className="text-sm text-muted-foreground cursor-pointer">
                Hard stop at limit
              </Label>
              <Switch
                id="hard-stop-toggle"
                checked={hardStopEnabled}
                onCheckedChange={(checked) => updateSettings.mutate({ hard_stop_enabled: checked } as any)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Buy Credits */}
      <div id="buy-credits">
        <h2 className="text-lg font-semibold text-foreground mb-4">Add Funds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {CREDIT_PACKAGES.map(pkg => (
            <Card key={pkg.id} className={`relative ${pkg.bestValue ? "border-primary shadow-md ring-1 ring-primary/20" : ""}`}>
              {pkg.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
                </div>
              )}
              <CardContent className="p-6 pt-8 text-center space-y-3">
                <div>
                  <p className="text-3xl font-extrabold text-foreground">${pkg.price}</p>
                  <p className="text-xs text-muted-foreground">${pkg.perCredit.toFixed(3)}/min</p>
                </div>
                <Button
                  className="w-full"
                  variant={pkg.bestValue ? "default" : "outline"}
                  disabled={creditLoading === pkg.id}
                  onClick={() => handleBuyCredits(pkg.price_id, pkg.id)}
                >
                  {creditLoading === pkg.id ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…</> : "Buy Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Auto-Refill */}
        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Auto-Refill</h3>
                <p className="text-sm text-muted-foreground">Automatically buy more credits when your balance gets low.</p>
              </div>
              <Switch checked={autoRefillEnabled} onCheckedChange={handleAutoRefillToggle} />
            </div>
            {autoRefillEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <Label className="text-sm text-muted-foreground">When balance drops below</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={autoRefillThreshold}
                      onChange={e => handleAutoRefillThreshold(e.target.value)}
                      className="w-24"
                    />
                    
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Automatically purchase</Label>
                  <Select value={autoRefillPackage} onValueChange={handleAutoRefillPackage}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREDIT_PACKAGES.map(pkg => (
                        <SelectItem key={pkg.id} value={String(pkg.credits)}>
                          {pkg.credits.toLocaleString()} credits (${pkg.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Credit Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage — This Billing Cycle</CardTitle>
          <CardDescription>Daily spend over the current billing cycle</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Spend ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No usage data available yet.</p>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-foreground">Total spent this cycle: ${totalSpent.toFixed(2)} ({totalMinutes.toFixed(1)} min)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Component</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "Infrastructure", cost: vapiCost },
                  { label: "Speech-to-text", cost: sttCost },
                  { label: "Language model (LLM)", cost: llmCost },
                  { label: "Text-to-speech", cost: ttsCost },
                  { label: "Transport / telephony", cost: transportCost },
                ].map(row => {
                  const rawTotal = billing?.costSummary?.total ?? 0;
                  const pct = rawTotal > 0 ? ((row.cost / rawTotal) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right">${row.cost.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{pct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Plan Comparison */}
      <div id="plans-section">
        <h2 className="text-lg font-semibold text-foreground mb-4">Compare Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(p => {
            const isCurrent = p.id === plan;
            const features = planFeatures[p.id] || [
              "Everything in Agency",
              "Unlimited team members",
              "Custom AI model training",
              "API access",
              "White-label option",
              "Custom integrations",
              "SLA guarantee",
            ];
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
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">${p.price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground italic">{p.tagline}</p>
                  <ul className="space-y-2">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {(() => {
                    const isDowngrade = !isCurrent && isPlanDowngrade(plan, p.id);
                    const label = checkoutLoading === p.id
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…</>
                      : isCurrent
                        ? "Current Plan"
                        : p.id === "voice_ai_custom"
                          ? "Contact Sales"
                          : isDowngrade
                            ? <><TrendingDown className="h-4 w-4 mr-1" /> Downgrade</>
                            : "Upgrade";
                    return (
                      <Button
                        variant={isCurrent ? "outline" : isDowngrade ? "outline" : "default"}
                        className={`w-full ${isDowngrade && !isCurrent ? "text-muted-foreground" : ""}`}
                        disabled={isCurrent || checkoutLoading === p.id}
                        onClick={() => handleChangePlan(p.id)}
                      >
                        {label}
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Usage is billed per minute at your package rate. Funds never expire.
        </p>
      </div>

      {/* Section 6: Purchase History (placeholder until transactions exist) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Credit purchase history will appear here after your first purchase.</p>
        </CardContent>
      </Card>

      {/* Section 7: Subscription Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscription Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Subscription invoices will appear here after your first billing cycle. Use "Manage Payment Method" to access full invoice history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

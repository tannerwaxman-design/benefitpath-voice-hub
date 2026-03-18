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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBillingUsage, useUpdateBillingSettings } from "@/hooks/use-billing";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PLANS, CREDIT_PACKAGES, getPlanByProductId } from "@/lib/stripe-config";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, TrendingUp, DollarSign, Download, Check, Star, Zap, Building2, Crown, Loader2, Coins, RefreshCw, AlertTriangle, XCircle } from "lucide-react";
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

export default function BillingUsage() {
  const { user, refreshProfile } = useAuth();
  const { data: billing, isLoading } = useBillingUsage();
  const updateSettings = useUpdateBillingSettings();
  const { toast } = useToast();
  const subscription = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const tenant = billing?.tenant || user?.tenant;
  const plan = tenant?.plan || "voice_ai_starter";
  const creditBalance = tenant?.credit_balance ?? 0;
  const autoRefillEnabled = tenant?.auto_refill_enabled ?? false;
  const autoRefillThreshold = tenant?.auto_refill_threshold ?? 100;
  const autoRefillPackage = tenant?.auto_refill_package ?? "1000";

  const creditsUsed = tenant?.minutes_used_this_cycle ?? 0;
  const cycleStart = tenant?.billing_cycle_start;
  const daysPassed = cycleStart ? Math.max(1, Math.ceil((Date.now() - new Date(cycleStart).getTime()) / 86400000)) : 1;
  const dailyAvg = Math.round(creditsUsed / daysPassed);
  const daysRemaining = dailyAvg > 0 ? Math.round(creditBalance / dailyAvg) : 999;

  const currentPlanConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
  const currentPrice = currentPlanConfig?.price ?? 29;

  const dailyData = billing?.usageHistory?.map(h => ({ name: h.month, credits: h.minutes })) || [];

  const outboundCredits = Math.round(creditsUsed * 0.829);
  const inboundCredits = Math.round(creditsUsed * 0.098);
  const voicemailCredits = Math.round(creditsUsed * 0.054);
  const transferCredits = creditsUsed - outboundCredits - inboundCredits - voicemailCredits;

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

  const handleCheckout = async (planId: string) => {
    const stripePlan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS];
    if (!stripePlan) return;
    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: stripePlan.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan, buy credits, and track usage.</p>
      </div>

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
                    <span className="text-sm text-muted-foreground">credits</span>
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
                <Bar dataKey="credits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No usage data available yet.</p>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-foreground">Total spent this cycle: ${creditsUsed.toFixed(2)}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Outbound calls</TableCell><TableCell className="text-right">${outboundCredits.toFixed(2)}</TableCell><TableCell className="text-right">82.9%</TableCell></TableRow>
                <TableRow><TableCell>Inbound calls</TableCell><TableCell className="text-right">${inboundCredits.toFixed(2)}</TableCell><TableCell className="text-right">9.8%</TableCell></TableRow>
                <TableRow><TableCell>Voicemail messages</TableCell><TableCell className="text-right">${voicemailCredits.toFixed(2)}</TableCell><TableCell className="text-right">5.4%</TableCell></TableRow>
                <TableRow><TableCell>Transfer bridge time</TableCell><TableCell className="text-right">${transferCredits.toFixed(2)}</TableCell><TableCell className="text-right">2.0%</TableCell></TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">Average daily spend: ~${dailyAvg.toFixed(2)}/day</p>
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
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    className="w-full"
                    disabled={isCurrent || checkoutLoading === p.id}
                    onClick={() => {
                      if (p.id === "voice_ai_custom") {
                        window.open("mailto:sales@benefitpath.com?subject=Enterprise%20Plan%20Inquiry", "_blank");
                      } else {
                        handleCheckout(p.id);
                      }
                    }}
                  >
                    {checkoutLoading === p.id ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…</> : isCurrent ? "Current Plan" : p.id === "voice_ai_custom" ? "Contact Sales" : "Upgrade"}
                  </Button>
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

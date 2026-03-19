import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, CreditCard, Phone, Bot, Check, ArrowRight, ArrowLeft, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import logo from "@/assets/benefit_path_icon.svg";

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Plan", icon: CreditCard },
  { id: 3, label: "Twilio", icon: Phone },
  { id: 4, label: "Agent", icon: Bot },
];

const PLANS = [
  {
    id: "voice_ai_starter",
    name: "Starter",
    price: "$99/mo",
    minutes: "500 minutes",
    features: ["1 AI Agent", "500 minutes/mo", "Basic analytics", "Email support"],
  },
  {
    id: "voice_ai_pro",
    name: "Pro",
    price: "$299/mo",
    minutes: "2,000 minutes",
    features: ["5 AI Agents", "2,000 minutes/mo", "Advanced analytics", "Priority support", "CRM integrations"],
    popular: true,
  },
  {
    id: "voice_ai_enterprise",
    name: "Enterprise",
    price: "Custom",
    minutes: "Unlimited",
    features: ["Unlimited agents", "Custom minutes", "Dedicated support", "Custom integrations", "SLA guarantee"],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1 state
  const [companyName, setCompanyName] = useState(user?.tenant?.company_name || "");
  const [industry, setIndustry] = useState(user?.tenant?.industry || "insurance");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [timezone, setTimezone] = useState(user?.tenant?.default_timezone || "America/New_York");

  // Step 2 state
  const [selectedPlan, setSelectedPlan] = useState("voice_ai_pro");

  // Step 3 state — Twilio credentials
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [twilioConnected, setTwilioConnected] = useState(false);

  // Step 4 state
  const [agentName, setAgentName] = useState("");
  const [agentGreeting, setAgentGreeting] = useState(
    "Hi, this is {{agent_name}} calling from {{company_name}}. How are you doing today?"
  );
  const [agentObjective, setAgentObjective] = useState("appointment_setting");
  const [agentCreating, setAgentCreating] = useState(false);

  const progress = (step / 4) * 100;

  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      toast({ title: "Company name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        company_name: companyName.trim(),
        industry,
        company_website: companyWebsite || null,
        default_timezone: timezone,
      })
      .eq("id", user!.tenant_id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleSelectPlan = async () => {
    setSaving(true);
    const limits: Record<string, number> = {
      voice_ai_starter: 500,
      voice_ai_pro: 2000,
      voice_ai_enterprise: 10000,
    };
    const { error } = await supabase
      .from("tenants")
      .update({
        plan: selectedPlan,
        monthly_minute_limit: limits[selectedPlan] || 2000,
      })
      .eq("id", user!.tenant_id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save plan", description: error.message, variant: "destructive" });
      return;
    }
    setStep(3);
  };

  const handleConnectTwilio = async () => {
    if (!twilioSid.trim() || !twilioToken.trim()) {
      toast({ title: "Both Account SID and Auth Token are required", variant: "destructive" });
      return;
    }
    setTwilioSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        twilio_account_sid: twilioSid.trim(),
        twilio_auth_token: twilioToken.trim(),
      })
      .eq("id", user!.tenant_id);
    setTwilioSaving(false);
    if (error) {
      toast({ title: "Failed to save Twilio credentials", description: error.message, variant: "destructive" });
      return;
    }
    setTwilioConnected(true);
    toast({ title: "Twilio connected successfully!" });
  };

  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      toast({ title: "Agent name required", variant: "destructive" });
      return;
    }
    setAgentCreating(true);
    try {
      const { error } = await supabase.functions.invoke("create-agent", {
        body: {
          agent_name: agentName.trim(),
          greeting_script: agentGreeting,
          call_objective: agentObjective,
          industry,
        },
      });
      if (error) throw error;
      toast({ title: "Agent created!" });
    } catch (err: unknown) {
      toast({ title: "Could not create agent", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      setAgentCreating(false);
      return;
    }
    setAgentCreating(false);
    await handleCompleteOnboarding();
  };

  const handleCompleteOnboarding = async () => {
    setSaving(true);
    await supabase
      .from("tenants")
      .update({ onboarding_completed: true })
      .eq("id", user!.tenant_id);
    await refreshProfile();
    setSaving(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="BenefitPath" className="h-8 w-auto" />
        <span className="text-lg font-semibold text-foreground">Setup your account</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive || isDone ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1.5" />

          {/* Step 1: Company Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Tell us about your company</CardTitle>
                <CardDescription>This helps us customize your experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Insurance Group" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="benefits">Employee Benefits</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="financial">Financial Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Company Website</Label>
                  <Input id="website" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={handleSaveCompany} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Choose your plan</CardTitle>
                <CardDescription>You can change your plan anytime from settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        selectedPlan === plan.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                      <p className="font-semibold text-foreground">{plan.name}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{plan.price}</p>
                      <p className="text-xs text-muted-foreground">{plan.minutes}</p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-primary" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <div className="pt-2 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleSelectPlan} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Connect Twilio */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Connect your Twilio account</CardTitle>
                <CardDescription>
                  Link your Twilio account to provision and manage phone numbers for your AI agents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Where to find your credentials
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Log in to your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Twilio Console <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Your <strong>Account SID</strong> and <strong>Auth Token</strong> are on the dashboard home page</li>
                    <li>Copy and paste them below</li>
                  </ol>
                </div>

                {twilioConnected ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Twilio account connected successfully!
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="twilio-sid">Account SID *</Label>
                      <Input
                        id="twilio-sid"
                        value={twilioSid}
                        onChange={(e) => setTwilioSid(e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="twilio-token">Auth Token *</Label>
                      <Input
                        id="twilio-token"
                        type="password"
                        value={twilioToken}
                        onChange={(e) => setTwilioToken(e.target.value)}
                        placeholder="Your Twilio Auth Token"
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button onClick={handleConnectTwilio} disabled={twilioSaving || !twilioSid.trim() || !twilioToken.trim()} variant="outline">
                      {twilioSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                      Connect Twilio
                    </Button>
                  </>
                )}

                <div className="pt-2 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!twilioConnected}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: First Agent */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Create your first AI agent</CardTitle>
                <CardDescription>You can refine your agent's configuration later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="agent-name">Agent Name *</Label>
                  <Input id="agent-name" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Sarah" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="objective">Call Objective</Label>
                  <Select value={agentObjective} onValueChange={setAgentObjective}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appointment_setting">Appointment Setting</SelectItem>
                      <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
                      <SelectItem value="survey">Survey / Feedback</SelectItem>
                      <SelectItem value="follow_up">Follow-up Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="greeting">Greeting Script</Label>
                  <Textarea
                    id="greeting"
                    value={agentGreeting}
                    onChange={(e) => setAgentGreeting(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Use {"{{agent_name}}"} and {"{{company_name}}"} as placeholders.</p>
                </div>
                <div className="pt-2 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleCreateAgent} disabled={agentCreating || !agentName.trim()}>
                    {agentCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
                    Create Agent & Finish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

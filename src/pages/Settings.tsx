import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Copy, RefreshCw, DollarSign, Clock, Phone, TrendingUp, AlertTriangle, Trash2, UserPlus, Eye, EyeOff, Key, Plus, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EnrollmentPeriodsSection } from "@/components/settings/EnrollmentPeriodsSection";
import { useBillingUsage, useUpdateBillingSettings } from "@/hooks/use-billing";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToolApiKeys, useConnectApiKey, useDisconnectApiKey, type ToolApiKey } from "@/hooks/use-tools";

const planNames: Record<string, string> = {
  voice_ai_starter: "Voice AI Starter",
  voice_ai_pro: "Voice AI Pro",
  voice_ai_enterprise: "Voice AI Enterprise",
};

const API_SERVICES = [
  { id: "ghl", label: "GoHighLevel" },
  { id: "hubspot", label: "HubSpot" },
  { id: "google_calendar", label: "Google Calendar" },
  { id: "salesforce", label: "Salesforce" },
  { id: "zapier", label: "Zapier" },
  { id: "custom", label: "Custom" },
];

function ApiKeysSection() {
  const { toast } = useToast();
  const { data: apiKeys = [], isLoading } = useToolApiKeys();
  const connectMutation = useConnectApiKey();
  const disconnectMutation = useDisconnectApiKey();
  const [addOpen, setAddOpen] = useState(false);
  const [service, setService] = useState("custom");
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.length > 8 ? key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4) : "••••••••";

  const handleAdd = async () => {
    if (!keyValue.trim()) return;
    const svc = API_SERVICES.find(s => s.id === service);
    await connectMutation.mutateAsync({
      service,
      api_key: keyValue.trim(),
      display_name: keyName.trim() || svc?.label || service,
    });
    setAddOpen(false);
    setKeyName("");
    setKeyValue("");
    setService("custom");
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="section-title">API Keys</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add API Key</Button>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead><tr className="bg-secondary/50">
            {["Name", "Service", "Key", "Status", "Connected", ""].map(h => <th key={h} className="px-4 py-3 text-left section-label">{h}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center"><Skeleton className="h-4 w-48 mx-auto" /></td></tr>
            ) : apiKeys.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                No API keys configured. Add one to connect external services.
              </td></tr>
            ) : apiKeys.map(k => (
              <tr key={k.id} className="border-t">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{k.display_name || k.service}</td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] capitalize">{k.service}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded text-foreground">
                      {visibleKeys.has(k.id) ? k.api_key : maskKey(k.api_key)}
                    </code>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleVisibility(k.id)}>
                      {visibleKeys.has(k.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(k.api_key)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-[10px] border-0 bg-success/10 text-success capitalize">{k.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(k.connected_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => disconnectMutation.mutate({ id: k.id, service: k.service })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add API Key</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {API_SERVICES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Display Name (optional)</Label>
              <Input placeholder="e.g. Production HubSpot Key" value={keyName} onChange={e => setKeyName(e.target.value)} />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" placeholder="Paste your API key..." value={keyValue} onChange={e => setKeyValue(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Your API key will be stored securely and used by your AI agents to interact with external services.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!keyValue.trim() || connectMutation.isPending}>
              {connectMutation.isPending ? "Saving..." : "Save Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PlatformApiKeySection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<{ id: string; api_key: string; status: string | null; last_used_at: string | null; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [visible, setVisible] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

  const fetchKey = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenant_api_keys")
      .select("*")
      .maybeSingle();
    setApiKey(data);
    setLoading(false);
  };

  useEffect(() => { fetchKey(); }, [user?.tenant_id]);

  const generateKey = async () => {
    setGenerating(true);
    const newKey = `bp_${crypto.randomUUID().replace(/-/g, "")}`;
    if (apiKey) {
      await supabase
        .from("tenant_api_keys")
        .update({ api_key: newKey, updated_at: new Date().toISOString() })
        .eq("id", apiKey.id);
    } else {
      await supabase
        .from("tenant_api_keys")
        .insert({ tenant_id: user!.tenant_id, api_key: newKey });
    }
    setGenerating(false);
    setVisible(true);
    fetchKey();
    toast({ title: apiKey ? "API key regenerated" : "API key generated", description: "Copy it now — you can reveal it later from this page." });
  };

  const revokeKey = async () => {
    if (!apiKey || !confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    await supabase.from("tenant_api_keys").delete().eq("id", apiKey.id);
    setApiKey(null);
    toast({ title: "API key revoked" });
  };

  const maskKey = (key: string) => key.slice(0, 6) + "•".repeat(24) + key.slice(-4);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-title">Platform API Key</CardTitle>
        <p className="text-sm text-muted-foreground">Use this key to integrate with Make, GoHighLevel, Zapier, or any HTTP client.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : apiKey ? (
          <>
            <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Your API Key</Label>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(apiKey.api_key)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <code className="block text-sm font-mono bg-background px-3 py-2 rounded border text-foreground break-all">
                {visible ? apiKey.api_key : maskKey(apiKey.api_key)}
              </code>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                {apiKey.last_used_at && <span>Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>}
                <Badge variant="secondary" className="text-[10px] border-0 bg-success/10 text-success">{apiKey.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generateKey} disabled={generating}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{generating ? "Regenerating..." : "Regenerate Key"}
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={revokeKey}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Revoke
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Key className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-3">No API key generated yet.</p>
            <Button onClick={generateKey} disabled={generating}>
              <Key className="h-4 w-4 mr-2" />{generating ? "Generating..." : "Generate API Key"}
            </Button>
          </div>
        )}

        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Quick Reference</p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Base URL</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded text-foreground break-all flex-1">{baseUrl}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(baseUrl)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Authentication Header</Label>
              <code className="block text-xs font-mono bg-secondary/50 px-2 py-1 rounded text-foreground">Authorization: Bearer {"<your_api_key>"}</code>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { method: "GET /contacts", desc: "List contacts (limit, offset)" },
              { method: "POST /contacts", desc: "Create a contact" },
              { method: "GET /calls", desc: "List call history" },
              { method: "POST /calls/trigger", desc: "Trigger a call (agent_id, phone_number)" },
              { method: "GET /agents", desc: "List active agents" },
              { method: "GET /calls/:id", desc: "Get call details + transcript" },
            ].map(ep => (
              <div key={ep.method} className="bg-secondary/20 rounded p-2">
                <span className="font-mono font-medium text-foreground">{ep.method}</span>
                <p className="text-muted-foreground mt-0.5">{ep.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const updateSettings = useUpdateBillingSettings();

  const [teamMembers, setTeamMembers] = useState<{ id: string; user_id: string; email: string; role: string; status: string; created_at: string }[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchTeamMembers = async () => {
    if (!user?.tenant_id) return;
    setTeamLoading(true);
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "list" },
    });
    if (data?.members) {
      setTeamMembers(data.members);
    }
    setTeamLoading(false);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [user?.tenant_id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "invite", email: inviteEmail.trim(), role: inviteRole },
    });
    setInviting(false);
    if (error || data?.error) {
      toast({ title: "Failed to invite", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Invitation sent!", description: `${inviteEmail} has been invited as ${inviteRole}.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      fetchTeamMembers();
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { action: "remove", member_id: memberId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to remove", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      fetchTeamMembers();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment Periods</TabsTrigger>
          <TabsTrigger value="billing">Billing & Usage</TabsTrigger>
          <TabsTrigger value="team">Team & Access</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="section-title">Account Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div><Label>Company Name</Label><Input defaultValue={user?.tenant?.company_name ?? ""} /></div>
              <div><Label>Primary Contact Email</Label><Input defaultValue={user?.email ?? ""} /></div>
              <div><Label>Company Website</Label><Input defaultValue="" /></div>
              <div>
                <Label>Industry</Label>
                <Select defaultValue="insurance">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="benefits">Employee Benefits</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company Logo</Label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Upload logo (PNG, JPG, max 2MB)</p>
                </div>
              </div>
              <Button onClick={() => toast({ title: "Settings saved!" })}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="section-title">CRM Integrations</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Salesforce", "HubSpot", "Zoho CRM"].map(crm => (
                  <div key={crm} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{crm}</p>
                      <p className="text-xs text-muted-foreground">Not Connected</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: `${crm} integration coming soon` })}>Connect</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="section-title">Webhook Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div><Label>Webhook URL</Label><Input placeholder="https://your-api.com/webhook" /></div>
              <div className="space-y-2">
                <Label>Events</Label>
                {["Call Started", "Call Completed", "Call Transferred", "Appointment Booked", "Voicemail Left"].map(evt => (
                  <div key={evt} className="flex items-center gap-3"><Switch defaultChecked /><span className="text-sm text-foreground">{evt}</span></div>
                ))}
              </div>
              <Button variant="outline" onClick={() => toast({ title: "Test webhook sent!" })}>Send Test Webhook</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="section-title">Calendar Integration</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Google Calendar", "Outlook Calendar", "Calendly"].map(cal => (
                  <div key={cal} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-foreground">{cal}</span>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: `${cal} connected!` })}>Connect</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="section-title">Do-Not-Call Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Manage your DNC list from the Contact Lists page</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast({ title: "DNC list uploaded" })}>Upload DNC List</Button>
                <Button variant="outline" onClick={() => toast({ title: "DNC list downloaded" })}>Download DNC List</Button>
              </div>
              <div><Label>Check Number</Label><div className="flex gap-2"><Input placeholder="+1 (555) 000-0000" /><Button variant="outline" onClick={() => toast({ title: "Number not on DNC list" })}>Check</Button></div></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="section-title">Call Recording Storage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Retention Policy</Label>
                <Select defaultValue="90">
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollment Periods */}
        <TabsContent value="enrollment" className="space-y-6 mt-6">
          <EnrollmentPeriodsSection />
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          {billingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : billing ? (
            <>
              {/* Credit Balance */}
              <Card>
                <CardHeader><CardTitle className="section-title">Subscription & Credits</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        ${(billing.tenant.credit_balance ?? 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {planNames[billing.tenant.plan] || billing.tenant.plan}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Billing cycle: {new Date(billing.tenant.billing_cycle_start).toLocaleDateString()} – {new Date(billing.tenant.billing_cycle_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => {
                        window.location.href = "/billing";
                      }}>
                        Manage Plan & Credits
                      </Button>
                      <Button variant="outline" size="sm" onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke("customer-portal");
                          if (error) throw error;
                          if (data?.url) window.open(data.url, "_blank");
                        } catch (err: unknown) {
                          toast({ title: "Could not open billing portal", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
                        }
                      }}>
                        Manage Payment Method
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Total Calls</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{billing.costSummary.totalCalls}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Minutes Used</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {billing.costSummary.totalMinutes.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Infrastructure Cost (at cost)</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">${billing.costSummary.total.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Revenue (w/ margin)</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">${(billing.tenant.total_cost_this_cycle || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Gauge + Cost Breakdown */}
              <Card>
                <CardHeader><CardTitle className="section-title">Usage & Cost Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Credit balance display */}
                    <div>
                      <div className="relative w-40 h-40 mx-auto">
                        <div className="w-full h-full rounded-full border-8 border-secondary flex flex-col items-center justify-center"
                          style={{ borderColor: (billing.tenant.credit_balance ?? 0) <= 1 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}>
                          <span className="text-2xl font-bold text-foreground">${(billing.tenant.credit_balance ?? 0).toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">balance</span>
                        </div>
                      </div>

                      {(billing.tenant.credit_balance ?? 0) <= 5 && (
                        <div className="mt-3 flex items-center gap-2 text-xs bg-destructive/10 text-destructive p-2 rounded-md">
                          <AlertTriangle className="h-3 w-3" />
                          {(billing.tenant.credit_balance ?? 0) <= 0 ? "Balance depleted!" : "Low balance — add credits soon"}
                        </div>
                      )}

                      <div className="mt-4 space-y-2 text-sm">
                        <p className="font-medium text-foreground mb-2">Cost per component (at-cost)</p>
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="text-foreground">${billing.costSummary.vapi.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span className="text-foreground">${billing.costSummary.transport.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Speech-to-Text</span><span className="text-foreground">${billing.costSummary.stt.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">LLM</span><span className="text-foreground">${billing.costSummary.llm.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Text-to-Speech</span><span className="text-foreground">${billing.costSummary.tts.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-2"><span className="font-medium text-foreground">Total at-cost</span><span className="font-bold text-foreground">${billing.costSummary.total.toFixed(2)}</span></div>
                        
                      </div>
                    </div>

                    {/* Monthly history chart */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Monthly Usage History</p>
                      {billing.usageHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={billing.usageHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number, name: string) =>
                                name === "minutes" ? [`${value} min`, "Minutes"] : [`$${value}`, "Cost"]
                              }
                            />
                            <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                          No usage history yet. Make some calls to see data here.
                        </div>
                      )}

                      {/* Per-minute cost */}
                      {billing.costSummary.totalMinutes > 0 && (
                        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Average cost per minute</p>
                          <div className="flex items-baseline gap-4 mt-1">
                            <div>
                              <span className="text-lg font-bold text-foreground">
                                ${(billing.costSummary.total / billing.costSummary.totalMinutes).toFixed(3)}
                              </span>
                              <span className="text-xs text-muted-foreground"> per minute</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Recent Usage Logs */}
              <Card>
                <CardHeader><CardTitle className="section-title">Recent Usage Logs</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead><tr className="bg-secondary/50">
                      {["Date", "Type", "Minutes", "Cost", ""].map(h => <th key={h} className="px-4 py-3 text-left section-label">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {billing.usageLogs.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No usage logs yet</td></tr>
                      ) : (
                        billing.usageLogs.slice(0, 20).map((log) => (
                          <tr key={log.id} className="border-t">
                            <td className="px-4 py-3 text-sm text-foreground">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{log.event_type}</Badge></td>
                            <td className="px-4 py-3 text-sm text-foreground">{log.quantity} min</td>
                            <td className="px-4 py-3 text-sm text-foreground">${Number(log.total_cost).toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">${Number(log.unit_cost).toFixed(3)}/min</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Unable to load billing data
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="section-title">Team Members</CardTitle>
              <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Invite Team Member</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead><tr className="bg-secondary/50">
                  {["Email", "Role", "Status", "Joined", ""].map(h => <th key={h} className="px-4 py-3 text-left section-label">{h}</th>)}
                </tr></thead>
                <tbody>
                  {teamLoading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center"><Skeleton className="h-4 w-48 mx-auto" /></td></tr>
                  ) : teamMembers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No team members found</td></tr>
                  ) : teamMembers.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {m.email}
                        {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`text-[10px] border-0 capitalize ${
                          m.status === 'active' ? 'bg-success/10 text-success' :
                          m.status === 'invited' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>{m.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {m.user_id !== user?.id && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveMember(m.id, m.email)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Platform API Key */}
          <PlatformApiKeySection />

          {/* Integration API Keys */}
          <ApiKeysSection />

          {/* Invite Modal */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — Full access</SelectItem>
                      <SelectItem value="manager">Manager — Can manage agents & campaigns</SelectItem>
                      <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  They'll receive an email invitation to join your team. If they already have an account, they'll be added immediately.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

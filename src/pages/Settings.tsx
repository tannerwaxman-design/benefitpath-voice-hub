import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Copy, RefreshCw, DollarSign, Clock, Phone, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useBillingUsage, useUpdateBillingSettings } from "@/hooks/use-billing";
import { Skeleton } from "@/components/ui/skeleton";

const teamMembers = [
  { name: "Michael Torres", email: "michael@benefitsfirst.com", role: "Admin", status: "Active", lastActive: "Today" },
  { name: "Jessica Lin", email: "jessica@benefitsfirst.com", role: "Manager", status: "Active", lastActive: "Yesterday" },
  { name: "David Park", email: "david@benefitsfirst.com", role: "Viewer", status: "Active", lastActive: "3 days ago" },
];

const planNames: Record<string, string> = {
  voice_ai_starter: "Voice AI Starter",
  voice_ai_pro: "Voice AI Pro",
  voice_ai_enterprise: "Voice AI Enterprise",
};

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const updateSettings = useUpdateBillingSettings();

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
                <CardHeader><CardTitle className="section-title">Credit Balance</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        ${(billing.tenant.credit_balance ?? 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {planNames[billing.tenant.plan] || billing.tenant.plan}
                        {billing.tenant.margin_percent > 0 && ` • ${billing.tenant.margin_percent}% margin`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Billing cycle: {new Date(billing.tenant.billing_cycle_start).toLocaleDateString()} – {new Date(billing.tenant.billing_cycle_end).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => toast({ title: "Add credits coming soon" })}>Add Credits</Button>
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
                      {billing.tenant.minutes_used_this_cycle.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground"> / {billing.tenant.monthly_minute_limit.toLocaleString()}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">VAPI Cost (at cost)</span>
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
                    {/* Usage gauge */}
                    <div>
                      <div className="relative w-40 h-40 mx-auto">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="40" fill="none"
                            stroke={billing.usagePercent >= 90 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                            strokeWidth="8"
                            strokeDasharray={`${Math.min(billing.usagePercent, 100) * 2.51} ${100 * 2.51}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-foreground">{billing.usagePercent}%</span>
                          <span className="text-xs text-muted-foreground">used</span>
                        </div>
                      </div>

                      {billing.usagePercent >= 80 && (
                        <div className="mt-3 flex items-center gap-2 text-xs bg-destructive/10 text-destructive p-2 rounded-md">
                          <AlertTriangle className="h-3 w-3" />
                          {billing.usagePercent >= 100 ? "Minute limit reached!" : "Approaching minute limit"}
                        </div>
                      )}

                      <div className="mt-4 space-y-2 text-sm">
                        <p className="font-medium text-foreground mb-2">Cost per component (VAPI at-cost)</p>
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform (Vapi)</span><span className="text-foreground">${billing.costSummary.vapi.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span className="text-foreground">${billing.costSummary.transport.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Speech-to-Text</span><span className="text-foreground">${billing.costSummary.stt.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">LLM</span><span className="text-foreground">${billing.costSummary.llm.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Text-to-Speech</span><span className="text-foreground">${billing.costSummary.tts.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t pt-2"><span className="font-medium text-foreground">Total at-cost</span><span className="font-bold text-foreground">${billing.costSummary.total.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-foreground">Your revenue (+{billing.tenant.margin_percent}%)</span><span className="font-bold text-primary">${(billing.tenant.total_cost_this_cycle || 0).toFixed(2)}</span></div>
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
                              <span className="text-xs text-muted-foreground"> at-cost</span>
                            </div>
                            <div>
                              <span className="text-lg font-bold text-primary">
                                ${((billing.tenant.total_cost_this_cycle || 0) / billing.costSummary.totalMinutes).toFixed(3)}
                              </span>
                              <span className="text-xs text-muted-foreground"> w/ margin</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={billing.tenant.hard_stop_enabled}
                        onCheckedChange={(checked) => updateSettings.mutate({ hard_stop_enabled: checked })}
                      />
                      <span className="text-sm text-foreground">Hard stop — block calls when minute limit is reached</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-foreground whitespace-nowrap">Alert at</Label>
                      <Select
                        value={String(billing.tenant.usage_alert_threshold || 80)}
                        onValueChange={(v) => updateSettings.mutate({ usage_alert_threshold: Number(v) })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="70">70%</SelectItem>
                          <SelectItem value="80">80%</SelectItem>
                          <SelectItem value="90">90%</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">of monthly limit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-foreground whitespace-nowrap">Margin</Label>
                      <Select
                        value={String(billing.tenant.margin_percent || 20)}
                        onValueChange={(v) => updateSettings.mutate({ margin_percent: Number(v) })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                          <SelectItem value="20">20%</SelectItem>
                          <SelectItem value="25">25%</SelectItem>
                          <SelectItem value="30">30%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">markup on VAPI costs</span>
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
              <Button size="sm" onClick={() => toast({ title: "Invite sent!" })}>Invite Team Member</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead><tr className="bg-secondary/50">
                  {["Name", "Email", "Role", "Status", "Last Active"].map(h => <th key={h} className="px-4 py-3 text-left section-label">{h}</th>)}
                </tr></thead>
                <tbody>
                  {teamMembers.map(m => (
                    <tr key={m.email} className="border-t">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.email}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{m.role}</Badge></td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">{m.status}</Badge></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="section-title">API Keys</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <code className="text-sm text-foreground flex-1 font-mono">bp_live_sk•••••••••••4f2a</code>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText("bp_live_sk_example_key_4f2a"); toast({ title: "API key copied!" }); }}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "API key regenerated!" })}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Use this key to integrate with your own systems.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

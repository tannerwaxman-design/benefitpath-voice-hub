import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Copy, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const usageHistory = [
  { month: "Sep", minutes: 3200 },
  { month: "Oct", minutes: 4100 },
  { month: "Nov", minutes: 5800 },
  { month: "Dec", minutes: 6200 },
  { month: "Jan", minutes: 3900 },
  { month: "Feb", minutes: 4328 },
];

const invoices = [
  { date: "Feb 1, 2026", amount: "$299.00", status: "Paid" },
  { date: "Jan 1, 2026", amount: "$299.00", status: "Paid" },
  { date: "Dec 1, 2025", amount: "$349.00", status: "Paid" },
];

const teamMembers = [
  { name: "Michael Torres", email: "michael@benefitsfirst.com", role: "Admin", status: "Active", lastActive: "Today" },
  { name: "Jessica Lin", email: "jessica@benefitsfirst.com", role: "Manager", status: "Active", lastActive: "Yesterday" },
  { name: "David Park", email: "david@benefitsfirst.com", role: "Viewer", status: "Active", lastActive: "3 days ago" },
];

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();

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
              <div><Label>Company Website</Label><Input defaultValue="https://benefitsfirst.com" /></div>
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
              <p className="text-sm text-muted-foreground">247 numbers on your DNC list</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast({ title: "DNC list uploaded" })}>Upload DNC List</Button>
                <Button variant="outline" onClick={() => toast({ title: "DNC list downloaded" })}>Download DNC List</Button>
              </div>
              <div><Label>Check Number</Label><div className="flex gap-2"><Input placeholder="(555) 000-0000" /><Button variant="outline" onClick={() => toast({ title: "Number not on DNC list" })}>Check</Button></div></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="section-title">Call Recording Storage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1"><span className="text-foreground">12.4 GB used</span><span className="text-muted-foreground">50 GB</span></div>
                  <div className="h-2 bg-secondary rounded-full"><div className="h-2 bg-primary rounded-full" style={{ width: "24.8%" }} /></div>
                </div>
              </div>
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
          <Card>
            <CardHeader><CardTitle className="section-title">Current Plan</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <p className="text-lg font-semibold text-foreground">Voice AI Pro</p>
                  <p className="text-sm text-muted-foreground">10,000 minutes/month • $299/month</p>
                  <p className="text-xs text-muted-foreground mt-1">Billing cycle: Feb 1 – Feb 28, 2026</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toast({ title: "Plan change modal would open" })}>Change Plan</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="section-title">Usage</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="relative w-40 h-40 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#4F46E5" strokeWidth="8" strokeDasharray={`${43.3 * 2.51} ${100 * 2.51}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground">43.3%</span>
                      <span className="text-xs text-muted-foreground">used</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Outbound calls</span><span className="text-foreground">3,892 min</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Voicemail</span><span className="text-foreground">312 min</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transfers</span><span className="text-foreground">124 min</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Monthly Usage History</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={usageHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="minutes" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3"><Switch defaultChecked /><span className="text-sm text-foreground">Alert me when usage exceeds 80%</span></div>
                <div className="flex items-center gap-3"><Switch /><span className="text-sm text-foreground">Hard stop — do not make calls beyond plan limit</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="section-title">Invoice History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead><tr className="bg-secondary/50">
                  {["Date", "Amount", "Status", ""].map(h => <th key={h} className="px-4 py-3 text-left section-label">{h}</th>)}
                </tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.date} className="border-t">
                      <td className="px-4 py-3 text-sm text-foreground">{inv.date}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{inv.amount}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">{inv.status}</Badge></td>
                      <td className="px-4 py-3"><button className="text-xs text-primary hover:underline">Download</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
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
              <p className="text-xs text-muted-foreground">Use this key to integrate BenefitPath Voice AI with your own systems.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

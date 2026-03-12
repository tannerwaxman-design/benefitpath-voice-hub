import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { agents } from "@/data/mockData";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import Papa from "papaparse";

const steps = ["Campaign Basics", "Contact List", "Schedule & Pacing", "Review & Launch"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploadTab, setUploadTab] = useState("csv");

  // ============================================
  // TODO: VAPI INTEGRATION
  // Endpoint: POST /call (for each contact)
  // Purpose: Create outbound call with assistant_id for each contact in campaign
  // Docs: https://docs.vapi.ai/api-reference/calls/create
  // ============================================

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    Papa.parse(file, {
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length > 1) {
          setCsvHeaders(data[0]);
          setCsvData(data.slice(1, 6)); // Show first 5 rows
          toast({ title: `Parsed ${result.data.length - 1} rows from ${file.name}` });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/campaigns")} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="page-title">Create Campaign</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden md:block ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4 max-w-xl">
              <div><Label>Campaign Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q2 Enrollment Outreach" /></div>
              <div><Label>Description</Label><Textarea placeholder="Describe this campaign's purpose..." /></div>
              <div>
                <Label>Select Agent *</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                  <SelectContent>{agents.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {a.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campaign Objective</Label>
                <Select defaultValue="appointment">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment">Appointment Setting</SelectItem>
                    <SelectItem value="qualification">Lead Qualification</SelectItem>
                    <SelectItem value="info">Information Delivery</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="payment">Payment Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select defaultValue="normal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                {["csv", "paste", "existing", "crm"].map(t => (
                  <button key={t} onClick={() => setUploadTab(t)}
                    className={`px-4 py-2 text-sm rounded-md ${uploadTab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >{{csv: "Upload CSV", paste: "Paste Numbers", existing: "Existing List", crm: "CRM Import"}[t]}</button>
                ))}
              </div>

              {uploadTab === "csv" && (
                <div>
                  <label className="block border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input type="file" accept=".csv,.tsv" className="hidden" onChange={handleCsvUpload} />
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-foreground">Drop your CSV file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">.csv, .tsv — Max 50,000 rows</p>
                  </label>
                  {csvData && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-foreground font-medium">{csvFileName} — {csvHeaders.length} columns</p>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              {csvHeaders.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left">
                                  <Select defaultValue={h.toLowerCase().includes("phone") ? "phone" : h.toLowerCase().includes("first") ? "first" : h.toLowerCase().includes("last") ? "last" : h.toLowerCase().includes("email") ? "email" : "skip"}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="first">First Name</SelectItem>
                                      <SelectItem value="last">Last Name</SelectItem>
                                      <SelectItem value="phone">Phone Number</SelectItem>
                                      <SelectItem value="email">Email</SelectItem>
                                      <SelectItem value="company">Company</SelectItem>
                                      <SelectItem value="skip">Skip</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvData.map((row, i) => (
                              <tr key={i} className="border-t">
                                {row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {uploadTab === "paste" && (
                <div>
                  <Textarea placeholder="Paste phone numbers, one per line..." rows={8} />
                  <p className="text-xs text-muted-foreground mt-1">For bulk calling without contact names.</p>
                </div>
              )}

              {uploadTab === "existing" && (
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select a contact list" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cl_001">Q1 Enrollment Leads (1,200 contacts)</SelectItem>
                    <SelectItem value="cl_002">Renewal Contacts 2026 (500 contacts)</SelectItem>
                    <SelectItem value="cl_003">New Employees Jan-Feb (200 contacts)</SelectItem>
                    <SelectItem value="cl_004">Medicare Eligible Clients (850 contacts)</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {uploadTab === "crm" && (
                <div className="grid grid-cols-2 gap-4">
                  {["Salesforce", "HubSpot", "Zoho", "Custom Webhook"].map(crm => (
                    <Card key={crm}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{crm}</span>
                        <Button variant="outline" size="sm" onClick={() => toast({ title: `${crm} integration coming soon` })}>Connect</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" defaultValue="2026-03-15" /></div>
                <div><Label>End Date</Label><Input type="date" /></div>
              </div>
              <div>
                <Label>Timezone Strategy</Label>
                <Select defaultValue="contact">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact">Use contact's local timezone</SelectItem>
                    <SelectItem value="account">Use account timezone for all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max calls per day</Label><Input type="number" defaultValue={200} min={10} max={5000} /></div>
                <div><Label>Max concurrent calls</Label><Input type="number" defaultValue={5} min={1} max={50} /></div>
              </div>
              <div className="space-y-3">
                <Label className="block">Retry Logic</Label>
                <div className="flex items-center gap-3"><Switch defaultChecked /><span className="text-sm text-foreground">Retry "No Answer" after 4 hours (max 3 attempts)</span></div>
                <div className="flex items-center gap-3"><Switch defaultChecked /><span className="text-sm text-foreground">Retry "Busy" after 30 min (max 2 attempts)</span></div>
                <div className="flex items-center gap-3"><Switch defaultChecked /><span className="text-sm text-foreground">Retry "Voicemail" after 24 hours (max 2 attempts)</span></div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-secondary/20"><CardContent className="p-4">
                  <p className="section-label mb-1">Campaign</p>
                  <p className="font-medium text-foreground">{name || "Untitled Campaign"}</p>
                </CardContent></Card>
                <Card className="bg-secondary/20"><CardContent className="p-4">
                  <p className="section-label mb-1">Agent</p>
                  <p className="font-medium text-foreground">{agents.find(a => a.id === selectedAgent)?.name || "Not selected"}</p>
                </CardContent></Card>
              </div>
              <Card className="bg-secondary/20"><CardContent className="p-4">
                <p className="section-label mb-1">Estimated Completion</p>
                <p className="text-sm text-foreground">Based on your settings, this campaign will take approximately 6 business days to complete.</p>
                <p className="text-sm text-muted-foreground mt-1">Estimated minute usage: 2,400 – 3,600 minutes</p>
              </CardContent></Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate("/campaigns")} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Campaign saved as draft" })}>Save as Draft</Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
          ) : (
            <Button onClick={() => { toast({ title: "Campaign launched!" }); navigate("/campaigns"); }}>Launch Now</Button>
          )}
        </div>
      </div>
    </div>
  );
}

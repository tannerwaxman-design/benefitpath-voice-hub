import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgents } from "@/hooks/use-agents";
import { useContactLists, useCreateContactList } from "@/hooks/use-contacts";
import { useCreateCampaign } from "@/hooks/use-campaigns";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import Papa from "papaparse";
import SmartSchedulePanel from "@/components/campaigns/SmartSchedulePanel";

const steps = ["Campaign Basics", "Contact List", "Schedule & Pacing", "Review & Launch"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: agents } = useAgents();
  const { data: contactLists } = useContactLists();
  const createCampaign = useCreateCampaign();
  const createContactList = useCreateContactList();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [objective, setObjective] = useState("appointment_setting");
  const [priority, setPriority] = useState("normal");

  // Contact list
  const [uploadTab, setUploadTab] = useState("csv");
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvAllRows, setCsvAllRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [existingListId, setExistingListId] = useState("");
  const [listName, setListName] = useState("");

  // Schedule
  const [startDate, setStartDate] = useState("");
  const [maxCallsPerDay, setMaxCallsPerDay] = useState(200);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [smartScheduleEnabled, setSmartScheduleEnabled] = useState(false);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setListName(file.name.replace(/\.(csv|tsv)$/i, ""));
    Papa.parse(file, {
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length > 1) {
          setCsvHeaders(data[0]);
          setCsvData(data.slice(1, 6));
          setCsvAllRows(data.slice(1).filter(r => r.some(c => c.trim())));
          // Auto-detect column mapping
          const mapping: Record<number, string> = {};
          data[0].forEach((h, i) => {
            const lower = h.toLowerCase();
            if (lower.includes("first") && lower.includes("name")) mapping[i] = "first_name";
            else if (lower.includes("last") && lower.includes("name")) mapping[i] = "last_name";
            else if (lower.includes("phone") || lower.includes("mobile")) mapping[i] = "phone";
            else if (lower.includes("email")) mapping[i] = "email";
            else if (lower.includes("company") || lower.includes("org")) mapping[i] = "company";
          });
          setColumnMapping(mapping);
          toast({ title: `Parsed ${data.length - 1} rows from ${file.name}` });
        }
      },
    });
  };

  const handleLaunch = async () => {
    if (!name.trim() || !selectedAgent) {
      toast({ title: "Missing required fields", variant: "destructive" });
      return;
    }

    try {
      let contactListId = existingListId;

      // If CSV was uploaded, create the contact list first
      if (uploadTab === "csv" && csvAllRows.length > 0) {
        const phoneIdx = Object.entries(columnMapping).find(([, v]) => v === "phone")?.[0];
        const firstIdx = Object.entries(columnMapping).find(([, v]) => v === "first_name")?.[0];
        const lastIdx = Object.entries(columnMapping).find(([, v]) => v === "last_name")?.[0];
        const emailIdx = Object.entries(columnMapping).find(([, v]) => v === "email")?.[0];
        const companyIdx = Object.entries(columnMapping).find(([, v]) => v === "company")?.[0];

        if (!phoneIdx) {
          toast({ title: "Please map a Phone column", variant: "destructive" });
          return;
        }

        const contacts = csvAllRows.map(row => ({
          first_name: firstIdx ? row[parseInt(firstIdx)] || "Unknown" : "Unknown",
          last_name: lastIdx ? row[parseInt(lastIdx)] || "Contact" : "Contact",
          phone: row[parseInt(phoneIdx)],
          email: emailIdx ? row[parseInt(emailIdx)] : undefined,
          company: companyIdx ? row[parseInt(companyIdx)] : undefined,
        })).filter(c => c.phone?.trim());

        const list = await createContactList.mutateAsync({
          name: listName || csvFileName,
          contacts,
        });
        contactListId = list.id;
      }

      // Create the campaign
      await createCampaign.mutateAsync({
        name,
        description: description || null,
        agent_id: selectedAgent,
        contact_list_id: contactListId || null,
        objective,
        priority,
        max_calls_per_day: maxCallsPerDay,
        max_concurrent_calls: maxConcurrent,
        scheduled_start: startDate || null,
        smart_schedule_enabled: smartScheduleEnabled,
        status: "draft",
      });

      navigate("/campaigns");
    } catch (err) {
      console.error("Campaign creation failed:", err);
    }
  };

  const isSaving = createCampaign.isPending || createContactList.isPending;

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
              <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this campaign's purpose..." /></div>
              <div>
                <Label>Select Agent *</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                  <SelectContent>
                    {agents?.filter(a => a.status === "active").map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.agent_name}{a.agent_title ? ` — ${a.agent_title}` : ""}</SelectItem>
                    ))}
                    {(!agents || agents.filter(a => a.status === "active").length === 0) && (
                      <div className="px-2 py-3 text-sm text-muted-foreground">No active agents. Create one first.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campaign Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment_setting">Appointment Setting</SelectItem>
                    <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
                    <SelectItem value="info_delivery">Information Delivery</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                {["csv", "existing"].map(t => (
                  <button key={t} onClick={() => setUploadTab(t)}
                    className={`px-4 py-2 text-sm rounded-md ${uploadTab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >{{ csv: "Upload CSV", existing: "Existing List" }[t]}</button>
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
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground font-medium">{csvFileName} — {csvAllRows.length} contacts</p>
                        <div>
                          <Label className="text-xs">List Name</Label>
                          <Input value={listName} onChange={e => setListName(e.target.value)} className="w-60 h-8 text-sm" />
                        </div>
                      </div>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              {csvHeaders.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left">
                                  <Select value={columnMapping[i] || "skip"} onValueChange={v => setColumnMapping(prev => ({ ...prev, [i]: v }))}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="first_name">First Name</SelectItem>
                                      <SelectItem value="last_name">Last Name</SelectItem>
                                      <SelectItem value="phone">Phone Number</SelectItem>
                                      <SelectItem value="email">Email</SelectItem>
                                      <SelectItem value="company">Company</SelectItem>
                                      <SelectItem value="skip">Skip</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-[10px] text-muted-foreground mt-1">{h}</p>
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

              {uploadTab === "existing" && (
                <Select value={existingListId} onValueChange={setExistingListId}>
                  <SelectTrigger><SelectValue placeholder="Select a contact list" /></SelectTrigger>
                  <SelectContent>
                    {contactLists?.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.total_contacts} contacts)</SelectItem>
                    ))}
                    {(!contactLists || contactLists.length === 0) && (
                      <div className="px-2 py-3 text-sm text-muted-foreground">No contact lists yet.</div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-xl">
              <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max calls per day</Label><Input type="number" value={maxCallsPerDay} onChange={e => setMaxCallsPerDay(parseInt(e.target.value))} min={10} max={5000} /></div>
                <div><Label>Max concurrent calls</Label><Input type="number" value={maxConcurrent} onChange={e => setMaxConcurrent(parseInt(e.target.value))} min={1} max={50} /></div>
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
                  <p className="font-medium text-foreground">{agents?.find(a => a.id === selectedAgent)?.agent_name || "Not selected"}</p>
                </CardContent></Card>
              </div>
              <Card className="bg-secondary/20"><CardContent className="p-4">
                <p className="section-label mb-1">Contacts</p>
                <p className="text-sm text-foreground">
                  {uploadTab === "csv" && csvAllRows.length > 0 ? `${csvAllRows.length} contacts from CSV upload` :
                   existingListId ? `Using existing list: ${contactLists?.find(l => l.id === existingListId)?.name}` : "No contacts selected"}
                </p>
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
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
          ) : (
            <Button onClick={handleLaunch} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Campaign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

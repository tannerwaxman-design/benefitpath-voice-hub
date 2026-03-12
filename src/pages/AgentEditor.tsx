import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { agents, voiceOptions } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, GripVertical, Play, Plus, Trash2, Upload, Wand2, X } from "lucide-react";

const sections = ["Basic Info", "Voice & Persona", "Conversation Flow", "Knowledge Base", "Call Handling Rules", "Transfer & Escalation", "Compliance", "Review & Save"];

const industries = ["Insurance", "Employee Benefits", "Health & Wellness", "Human Resources", "Financial Services", "Medicare", "Dental/Vision", "Life Insurance", "Workers' Comp", "Other"];

const objections = [
  { objection: "\"I'm not interested\"", response: "Acknowledge, briefly restate value, offer to send info via email instead" },
  { objection: "\"I already have coverage\"", response: "\"That's great! I actually wanted to make sure you're getting the most out of your current plan...\"" },
  { objection: "\"I'm busy right now\"", response: "\"I completely understand. When would be a better time for me to call back?\"" },
  { objection: "\"How did you get my number?\"", response: "\"Your information was provided as part of [Company]'s benefits enrollment process.\"" },
  { objection: "\"Is this a scam / robot?\"", response: "\"I understand the concern! I'm reaching out on behalf of [Company]. I can transfer you to a live team member.\"" },
];

export default function AgentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";
  const existingAgent = agents.find(a => a.id === id);
  
  const [activeSection, setActiveSection] = useState(0);
  const [name, setName] = useState(existingAgent?.name || "");
  const [title, setTitle] = useState(existingAgent?.title || "");
  const [industry, setIndustry] = useState(existingAgent?.industry || "Insurance");
  const [agentActive, setAgentActive] = useState(existingAgent?.status === "active");
  const [selectedVoice, setSelectedVoice] = useState(existingAgent?.voiceId || "aria");
  const [speed, setSpeed] = useState([1.0]);
  const [tone, setTone] = useState("Professional");
  const [enthusiasm, setEnthusiasm] = useState([6]);
  const [fillerWords, setFillerWords] = useState(true);
  const [greeting, setGreeting] = useState(`Hi, this is ${name || "[Agent Name]"} from Benefits First Insurance Group. I'm calling about your upcoming benefits enrollment period. Is this a good time to chat for a couple of minutes?`);
  const [questions, setQuestions] = useState([
    "Are you currently enrolled in your employer's benefits plan?",
    "When does your current coverage renew?",
    "Is there anything specific about your benefits you'd like to better understand?",
    "How many dependents do you have on your plan?",
  ]);
  const [recordCalls, setRecordCalls] = useState(true);
  const [disclosure, setDisclosure] = useState(true);
  const [leaveVoicemail, setLeaveVoicemail] = useState(true);

  // ============================================
  // TODO: VAPI INTEGRATION
  // Endpoint: POST /assistant (create) or PATCH /assistant/{id} (update)
  // Purpose: Create/update VAPI assistant with full config
  // Docs: https://docs.vapi.ai/api-reference/assistants/create
  // ============================================

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/agents")} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="page-title">{isNew ? "Create New Agent" : `Edit: ${existingAgent?.name}`}</h1>
      </div>

      <div className="flex gap-6">
        {/* Left Mini Nav */}
        <div className="w-48 shrink-0 hidden lg:block">
          <nav className="sticky top-6 space-y-1">
            {sections.map((s, i) => (
              <button key={s} onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${i === activeSection ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}
              >{i + 1}. {s}</button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-8 max-w-3xl">
          {/* Section 1: Basic Info */}
          <Card id="section-0">
            <CardHeader><CardTitle className="section-title">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Agent Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sarah" maxLength={30} /></div>
                <div><Label>Agent Title/Role</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Benefits Specialist" /></div>
              </div>
              <div><Label>Company Name</Label><Input defaultValue="Benefits First Insurance Group" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primary Language</Label>
                  <Select defaultValue="en-us">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-us">English (US)</SelectItem>
                      <SelectItem value="en-uk">English (UK)</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Agent Description</Label><Textarea placeholder="Internal note about this agent's purpose..." maxLength={200} /></div>
              <div className="flex items-center gap-3">
                <Switch checked={agentActive} onCheckedChange={setAgentActive} />
                <Label>Agent is {agentActive ? "Active" : "Inactive"}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Voice & Persona */}
          <Card id="section-1">
            <CardHeader><CardTitle className="section-title">Voice & Persona</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Voice Selection</Label>
                {/* TODO: VAPI API — Map voice selection to VAPI voice ID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {voiceOptions.map(v => (
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${selectedVoice === v.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{v.name}</span>
                        {selectedVoice === v.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{v.gender}</p>
                      <p className="text-[10px] text-muted-foreground">{v.accent}</p>
                      <button className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline" onClick={e => { e.stopPropagation(); toast({ title: `Playing voice sample for ${v.name}...` }); }}>
                        <Play className="h-3 w-3" /> Preview
                      </button>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Speaking Speed: {speed[0]}x</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Slower</span>
                    <Slider value={speed} onValueChange={setSpeed} min={0.75} max={1.5} step={0.05} className="flex-1" />
                    <span className="text-xs text-muted-foreground">Faster</span>
                  </div>
                </div>
                <div>
                  <Label>Enthusiasm: {enthusiasm[0]}/10</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Reserved</span>
                    <Slider value={enthusiasm} onValueChange={setEnthusiasm} min={1} max={10} step={1} className="flex-1" />
                    <span className="text-xs text-muted-foreground">Enthusiastic</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Tone</Label>
                <div className="flex gap-2">
                  {["Professional", "Friendly", "Conversational", "Empathetic"].map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`px-4 py-2 text-sm rounded-md border transition-colors ${tone === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={fillerWords} onCheckedChange={setFillerWords} />
                <div>
                  <Label>Include natural filler words</Label>
                  <p className="text-xs text-muted-foreground">Makes the agent sound more human and natural</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Conversation Flow */}
          <Card id="section-2">
            <CardHeader><CardTitle className="section-title">Conversation Flow</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Greeting Script</Label>
                  <button onClick={() => toast({ title: "Greeting regenerated!" })} className="flex items-center gap-1 text-xs text-primary hover:underline"><Wand2 className="h-3 w-3" /> Regenerate</button>
                </div>
                <Textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{greeting.length} characters</p>
              </div>

              <div>
                <Label className="mb-2 block">Call Objective</Label>
                <Select defaultValue="appointment">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment">Appointment Setting</SelectItem>
                    <SelectItem value="qualification">Lead Qualification</SelectItem>
                    <SelectItem value="enrollment">Benefits Enrollment Follow-Up</SelectItem>
                    <SelectItem value="renewal">Policy Renewal Reminder</SelectItem>
                    <SelectItem value="survey">Survey / Feedback Collection</SelectItem>
                    <SelectItem value="payment">Payment Reminder</SelectItem>
                    <SelectItem value="info">General Information</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Discovery Questions</Label>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                      <Input value={q} onChange={e => { const nq = [...questions]; nq[i] = e.target.value; setQuestions(nq); }} className="flex-1" />
                      <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setQuestions([...questions, ""])} className="flex items-center gap-1 text-sm text-primary hover:underline"><Plus className="h-4 w-4" /> Add Question</button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Objection Handling</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 gap-0 bg-secondary/50 px-4 py-2">
                    <span className="section-label">Objection</span>
                    <span className="section-label">Response Strategy</span>
                  </div>
                  {objections.map((o, i) => (
                    <div key={i} className="grid grid-cols-2 gap-0 px-4 py-3 border-t text-sm">
                      <span className="text-foreground pr-4">{o.objection}</span>
                      <span className="text-muted-foreground">{o.response}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Voicemail Script</Label>
                <Textarea defaultValue={`Hi [Contact Name], this is ${name || "[Agent Name]"} from Benefits First Insurance Group. I was calling about your upcoming benefits enrollment. Please give us a call back or I'll try you again soon. Have a great day!`} rows={3} />
                <div className="flex items-center gap-3 mt-3">
                  <Switch checked={leaveVoicemail} onCheckedChange={setLeaveVoicemail} />
                  <Label>Leave voicemail on no answer</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Knowledge Base */}
          <Card id="section-3">
            <CardHeader><CardTitle className="section-title">Knowledge Base</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Knowledge</Label>
                <Textarea placeholder="Paste your company's key information here. Plan types, pricing tiers, enrollment deadlines, FAQs..." rows={4} className="mt-1" />
              </div>
              <div>
                <Label className="mb-2 block">Document Upload</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground">Drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, CSV — Max 10MB per file</p>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <div><p className="text-sm text-foreground">2026_Benefits_Guide.pdf</p><p className="text-xs text-muted-foreground">2.4 MB</p></div>
                    <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <div><p className="text-sm text-foreground">FAQ_Sheet.docx</p><p className="text-xs text-muted-foreground">340 KB</p></div>
                    <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px]">Ready</Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Website URL Import</Label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="https://yourcompany.com" className="flex-1" />
                  <Button onClick={() => toast({ title: "Content imported from website!" })}>Import</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Call Handling */}
          <Card id="section-4">
            <CardHeader><CardTitle className="section-title">Call Handling Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Business Hours</Label>
                <div className="space-y-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                    <div key={day} className="flex items-center gap-3">
                      <Switch defaultChecked={i < 5} />
                      <span className="w-10 text-sm font-medium text-foreground">{day}</span>
                      {i < 5 && (
                        <div className="flex items-center gap-2">
                          <Input type="time" defaultValue="09:00" className="w-32" />
                          <span className="text-muted-foreground">—</span>
                          <Input type="time" defaultValue="18:00" className="w-32" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Max concurrent calls</Label><Input type="number" defaultValue={5} min={1} max={50} /></div>
                <div><Label>Max calls/contact/day</Label><Input type="number" defaultValue={2} min={1} max={5} /></div>
                <div><Label>Max total attempts</Label><Input type="number" defaultValue={4} min={1} max={10} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max call duration (min)</Label><Input type="number" defaultValue={10} min={1} max={30} /></div>
                <div><Label>Silence timeout (sec)</Label><Input type="number" defaultValue={15} min={5} max={60} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Transfer */}
          <Card id="section-5">
            <CardHeader><CardTitle className="section-title">Transfer & Escalation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Transfer Triggers</Label>
                <div className="space-y-2">
                  {[
                    { label: "Caller explicitly requests to speak with a human", defaultOn: true },
                    { label: "High-intent buyer signal detected", defaultOn: true },
                    { label: "Caller becomes frustrated or angry", defaultOn: true },
                    { label: "AI cannot answer after 2 attempts", defaultOn: false },
                    { label: "Caller mentions a competitor", defaultOn: false },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-3">
                      <Switch defaultChecked={t.defaultOn} />
                      <span className="text-sm text-foreground">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Transfer phone number</Label><Input placeholder="(555) 000-0000" /></div>
                <div><Label>Backup number</Label><Input placeholder="(555) 000-0001" /></div>
              </div>
              <div>
                <Label>Transfer announcement</Label>
                <Textarea defaultValue="I'm going to connect you with one of our benefits specialists who can help you further. Please hold for just a moment." rows={2} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Compliance */}
          <Card id="section-6">
            <CardHeader><CardTitle className="section-title">Compliance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">BenefitPath Voice AI is designed to help you comply with TCPA, TSR, and state telemarketing regulations. Compliance is ultimately your responsibility.</p>
              </div>
              <div className="flex items-center gap-3"><Switch checked={recordCalls} onCheckedChange={setRecordCalls} /><Label>Record all calls</Label></div>
              <div className="flex items-center gap-3"><Switch checked={disclosure} onCheckedChange={setDisclosure} /><Label>Play recording disclosure at start of call</Label></div>
              <div><Label>Disclosure Script</Label><Textarea defaultValue="This call may be recorded for quality and training purposes." rows={2} className="mt-1" /></div>
              <div className="flex items-center gap-3"><Switch defaultChecked disabled /><Label>Respect Do-Not-Call requests immediately (required)</Label></div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => toast({ title: "Agent saved as draft" })}>Save as Draft</Button>
            <Button onClick={() => toast({ title: "Agent saved and activated!" })}>Save & Activate Agent</Button>
            <Button variant="outline" onClick={() => toast({ title: "Test call modal would open here" })}>Test Call</Button>
            {!isNew && <Button variant="ghost" className="text-destructive ml-auto" onClick={() => toast({ title: "Agent deleted", variant: "destructive" })}>Delete Agent</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

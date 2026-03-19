import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAgent, useCreateAgent, useUpdateAgent, useDeleteAgent, useTestCall } from "@/hooks/use-agents";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, FlaskConical, GripVertical, Loader2, Phone, PhoneIncoming, PhoneOutgoing, Play, Plus, Trash2, Upload, Volume2, Wand2 } from "lucide-react";
import { AbTestField } from "@/components/agents/AbTestField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";
const AbTestResults = lazy(() => import("@/components/agents/AbTestResults"));
import { AgentTemplatePicker, AgentTemplate } from "@/components/agents/AgentTemplatePicker";
import { PostCallActionsSection, PostCallActionsConfig } from "@/components/agents/PostCallActionsSection";
import { useAvailableVoices, useTtsPreview, Voice } from "@/hooks/use-voice-management";
import { Link } from "react-router-dom";

const sectionDefs = [
  { id: "section-basic-info", label: "Basic Info" },
  { id: "section-voice-persona", label: "Voice & Persona" },
  { id: "section-conversation-flow", label: "Conversation Flow" },
  { id: "section-knowledge-base", label: "Knowledge Base" },
  { id: "section-call-direction", label: "Call Direction" },
  { id: "section-call-handling", label: "Call Handling Rules" },
  { id: "section-transfer", label: "Transfer & Escalation" },
  { id: "section-after-call", label: "After the Call" },
  { id: "section-compliance", label: "Compliance" },
  { id: "section-review", label: "Review & Save" },
];

const industries = ["Insurance", "Employee Benefits", "Health & Wellness", "Human Resources", "Financial Services", "Medicare", "Dental/Vision", "Life Insurance", "Workers' Comp", "Other"];

// No more fallback voices - using voice management system

export default function AgentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = id === "new";
  const { data: existingAgent, isLoading } = useAgent(id);

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const testCall = useTestCall();
  const { data: availableVoices, isLoading: voicesLoading } = useAvailableVoices();
  const { play: playTts, stop: stopTts } = useTtsPreview();
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState(false);

  const [activeSection, setActiveSection] = useState("section-basic-info");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("Insurance");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [agentActive, setAgentActive] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [speed, setSpeed] = useState([1.0]);
  const [tone, setTone] = useState("professional");
  const [enthusiasm, setEnthusiasm] = useState([6]);
  const [fillerWords, setFillerWords] = useState(true);
  const [greeting, setGreeting] = useState("Hi, this is [Agent Name] from [Company]. I'm calling about your upcoming benefits enrollment period. Is this a good time to chat for a couple of minutes?");
  const [callObjective, setCallObjective] = useState("appointment_setting");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [voicemailScript, setVoicemailScript] = useState("");
  const [voicemailEnabled, setVoicemailEnabled] = useState(true);
  const [voicemailMethod, setVoicemailMethod] = useState<"live" | "drop">("live");
  const [voicemailAudioUrl, setVoicemailAudioUrl] = useState<string | null>(null);
  const [recordCalls, setRecordCalls] = useState(true);
  const [disclosure, setDisclosure] = useState(true);
  const [transferPhone, setTransferPhone] = useState("");
  const [backupTransfer, setBackupTransfer] = useState("");
  const [transferAnnouncement, setTransferAnnouncement] = useState("I'm going to connect you with one of our specialists. Please hold for a moment.");
  const [showTestCallDialog, setShowTestCallDialog] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(isNew);
  const [callDirection, setCallDirection] = useState("outbound");
  const [inboundGreeting, setInboundGreeting] = useState("Thank you for calling. How can I help you today?");
  const [answerAfterRings, setAnswerAfterRings] = useState(2);
  const [afterHoursBehavior, setAfterHoursBehavior] = useState("voicemail");
  const [afterHoursVoicemailMessage, setAfterHoursVoicemailMessage] = useState("Thank you for calling. Our office is currently closed. Please leave a message and we'll call you back on the next business day.");
  const [voiceSource, setVoiceSource] = useState<"preset" | "cloned">("preset");
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [voiceCloneStatus, setVoiceCloneStatus] = useState<string | null>(null);
  const [postCallActions, setPostCallActions] = useState<PostCallActionsConfig>({
    post_call_email_enabled: false,
    post_call_email_subject: "Thanks for chatting with us!",
    post_call_email_body: "",
    post_call_email_trigger: "connected_only",
    post_call_sms_enabled: false,
    post_call_sms_body: "",
    post_call_notification_enabled: false,
    post_call_notification_email: "",
    post_call_notification_triggers: ["appointment_booked", "lead_qualified", "callback_requested"],
    post_call_notification_includes: ["call_summary", "contact_info"],
    post_call_task_enabled: false,
  });

  const applyTemplate = (template: AgentTemplate | null) => {
    if (template) {
      const d = template.defaults;
      setName(d.agent_name);
      setTitle(d.agent_title);
      setTone(d.tone);
      setEnthusiasm([d.enthusiasm_level]);
      setGreeting(d.greeting_script);
      setCallObjective(d.call_objective);
      setCallDirection(d.call_direction);
      setInboundGreeting(d.inbound_greeting || "Thank you for calling. How can I help you today?");
      setVoicemailScript(d.voicemail_script);
      setKnowledgeBase(d.knowledge_base_text);
    }
    setShowTemplatePicker(false);
  };

  // Populate form with existing agent data
  if (existingAgent && !initialized) {
    setName(existingAgent.agent_name);
    setTitle(existingAgent.agent_title || "");
    setIndustry(existingAgent.industry || "Insurance");
    setCompanyName(existingAgent.company_name_override || "");
    setDescription(existingAgent.description || "");
    setAgentActive(existingAgent.status === "active");
    setSelectedVoice(existingAgent.voice_id);
    setSpeed([existingAgent.speaking_speed || 1.0]);
    setTone(existingAgent.tone);
    setEnthusiasm([existingAgent.enthusiasm_level]);
    setFillerWords(existingAgent.filler_words_enabled);
    setGreeting(existingAgent.greeting_script);
    setCallObjective(existingAgent.call_objective);
    setKnowledgeBase(existingAgent.knowledge_base_text || "");
    setVoicemailScript(existingAgent.voicemail_script || "");
    setVoicemailEnabled(existingAgent.voicemail_enabled);
    setVoicemailMethod((existingAgent as any).voicemail_method || "live");
    setVoicemailAudioUrl((existingAgent as any).voicemail_audio_url || null);
    setRecordCalls(existingAgent.record_calls);
    setDisclosure(existingAgent.play_disclosure);
    setTransferPhone(existingAgent.transfer_phone_number || "");
    setBackupTransfer(existingAgent.backup_transfer_number || "");
    setTransferAnnouncement(existingAgent.transfer_announcement || "");
    setCallDirection((existingAgent as any).call_direction || "outbound");
    setInboundGreeting((existingAgent as any).inbound_greeting || "Thank you for calling. How can I help you today?");
    setAnswerAfterRings((existingAgent as any).answer_after_rings ?? 2);
    setAfterHoursBehavior((existingAgent as any).after_hours_behavior || "voicemail");
    setVoiceSource((existingAgent as any).voice_source || "preset");
    setClonedVoiceId((existingAgent as any).cloned_voice_id || null);
    setVoiceCloneStatus((existingAgent as any).voice_clone_status || null);
    setAfterHoursVoicemailMessage((existingAgent as any).after_hours_voicemail_message || "");
    const ea = existingAgent as any;
    setPostCallActions({
      post_call_email_enabled: ea.post_call_email_enabled ?? false,
      post_call_email_subject: ea.post_call_email_subject || "Thanks for chatting with us!",
      post_call_email_body: ea.post_call_email_body || "",
      post_call_email_trigger: ea.post_call_email_trigger || "connected_only",
      post_call_sms_enabled: ea.post_call_sms_enabled ?? false,
      post_call_sms_body: ea.post_call_sms_body || "",
      post_call_notification_enabled: ea.post_call_notification_enabled ?? false,
      post_call_notification_email: ea.post_call_notification_email || "",
      post_call_notification_triggers: ea.post_call_notification_triggers || ["appointment_booked", "lead_qualified", "callback_requested"],
      post_call_notification_includes: ea.post_call_notification_includes || ["call_summary", "contact_info"],
      post_call_task_enabled: ea.post_call_task_enabled ?? false,
    });
    setInitialized(true);
  }

  // Scroll spy for sidebar nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sectionDefs.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  if (isNew && showTemplatePicker) {
    return <AgentTemplatePicker onSelect={applyTemplate} />;
  }

  if (isLoading && !isNew) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const buildFormData = () => ({
    agent_id: isNew ? undefined : id,
    agent_name: name,
    agent_title: title || null,
    industry,
    company_name_override: companyName || null,
    description: description || null,
    status: agentActive ? "active" : "draft",
    voice_id: voiceSource === "cloned" && clonedVoiceId ? clonedVoiceId : selectedVoice,
    voice_provider: "eleven_labs",
    voice_name: voiceSource === "cloned" ? "My Voice Clone" : (availableVoices?.find(v => v.provider_voice_id === selectedVoice)?.name || null),
    voice_source: voiceSource,
    cloned_voice_id: clonedVoiceId,
    voice_clone_status: voiceCloneStatus,
    speaking_speed: speed[0],
    tone,
    enthusiasm_level: enthusiasm[0],
    filler_words_enabled: fillerWords,
    greeting_script: greeting,
    call_objective: callObjective,
    knowledge_base_text: knowledgeBase || null,
    voicemail_script: voicemailScript || null,
    voicemail_enabled: voicemailEnabled,
    record_calls: recordCalls,
    play_disclosure: disclosure,
    transfer_phone_number: transferPhone || null,
    backup_transfer_number: backupTransfer || null,
    transfer_announcement: transferAnnouncement || null,
    call_direction: callDirection,
    inbound_greeting: inboundGreeting || null,
    answer_after_rings: answerAfterRings,
    after_hours_behavior: afterHoursBehavior,
    after_hours_voicemail_message: afterHoursVoicemailMessage || null,
    ...postCallActions,
  });

  const handleSave = async (activate: boolean) => {
    if (!name.trim()) {
      toast({ title: "Agent name is required", variant: "destructive" });
      return;
    }
    const formData = buildFormData();
    if (activate) formData.status = "active";

    if (isNew) {
      createAgent.mutate(formData, {
        onSuccess: (data) => {
          if (data?.agent?.id) navigate(`/agents/${data.agent.id}`);
          else navigate("/agents");
        },
      });
    } else {
      updateAgent.mutate(formData);
    }
  };

  const formatPhoneE164 = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (phone.startsWith("+")) return phone;
    return `+${digits}`;
  };

  const handleTestCall = () => {
    if (!testPhoneNumber.trim()) {
      toast({ title: "Enter a phone number", variant: "destructive" });
      return;
    }
    const formatted = formatPhoneE164(testPhoneNumber);
    testCall.mutate({
      agent_id: id!,
      contact_phone: formatted,
      contact_name: "Test Call",
    });
    setShowTestCallDialog(false);
  };

  const isSaving = createAgent.isPending || updateAgent.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/agents")} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="page-title">{isNew ? "Create New Agent" : `Edit: ${existingAgent?.agent_name}`}</h1>
        {existingAgent && (
          <Badge variant="secondary" className={
            existingAgent.vapi_sync_status === "synced" ? "bg-success/10 text-success border-0 text-xs" :
            existingAgent.vapi_sync_status === "error" ? "bg-destructive/10 text-destructive border-0 text-xs" :
            "bg-warning/10 text-warning border-0 text-xs"
          }>
            {existingAgent.vapi_sync_status === "synced" ? "✓ Synced" : existingAgent.vapi_sync_status === "error" ? "⚠ Sync Error" : "Pending Sync"}
          </Badge>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left Mini Nav */}
        <div className="w-48 shrink-0 hidden lg:block">
          <nav className="sticky top-6 space-y-1">
            {sectionDefs.map((s) => (
              <button key={s.id} onClick={() => {
                const el = document.getElementById(s.id);
                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(s.id); }
              }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors border-l-2 ${activeSection === s.id ? "border-primary bg-primary/10 text-primary font-medium" : "border-transparent text-muted-foreground hover:bg-secondary"}`}
              >{s.label}</button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-8 max-w-3xl">
          {/* Section 1: Basic Info */}
          <Card id="section-basic-info">
            <CardHeader><CardTitle className="section-title">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Agent Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sarah" maxLength={30} /></div>
                <div><Label>Agent Title/Role</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Benefits Specialist" /></div>
              </div>
              <div><Label>Company Name Override</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={user?.tenant.company_name || "Your company name"} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Agent Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Internal note about this agent's purpose..." /></div>
              <div className="flex items-center gap-3">
                <Switch checked={agentActive} onCheckedChange={setAgentActive} />
                <Label>Agent is {agentActive ? "Active" : "Inactive"}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Voice & Persona */}
          <Card id="section-voice-persona">
            <CardHeader><CardTitle className="section-title">Voice & Persona</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Simple voice dropdown */}
              <div>
                <Label className="mb-2 block">Voice {voicesLoading && <span className="text-xs text-muted-foreground">(loading...)</span>}</Label>
                <p className="text-xs text-muted-foreground mb-3">Select a voice for this agent:</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={selectedVoice} onValueChange={(val) => { setSelectedVoice(val); setVoiceSource("preset"); }}>
                      <SelectTrigger><SelectValue placeholder="Select a voice..." /></SelectTrigger>
                      <SelectContent>
                        {(availableVoices || []).map(v => (
                          <SelectItem key={v.id} value={v.provider_voice_id}>
                            {v.name}{v.type === "cloned" ? " — Cloned" : ""}{v.style ? ` — ${v.gender}, ${v.style}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 shrink-0"
                    disabled={!selectedVoice || ttsPreviewLoading}
                    onClick={async () => {
                      if (!selectedVoice || !greeting) return;
                      setTtsPreviewLoading(true);
                      try {
                        await playTts(greeting, selectedVoice);
                      } catch {} finally {
                        setTtsPreviewLoading(false);
                      }
                    }}
                  >
                    {ttsPreviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Preview
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Don't see the right voice?{" "}
                  <Link to="/voices" className="text-primary hover:underline">Go to Voices →</Link>
                </p>
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
                  {["professional", "friendly", "conversational", "empathetic"].map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`px-4 py-2 text-sm rounded-md border transition-colors capitalize ${tone === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={fillerWords} onCheckedChange={setFillerWords} />
                <div>
                  <Label>Include natural filler words</Label>
                  <p className="text-xs text-muted-foreground">Makes the agent sound more human</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Conversation Flow */}
          <Card id="section-conversation-flow">
            <CardHeader><CardTitle className="section-title">Conversation Flow</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <AbTestField agentId={id} field="greeting" label="Greeting Script" currentValue={greeting} onValueChange={setGreeting} />
                <p className="text-xs text-muted-foreground mt-1">Use [First Name], [Company] as placeholders</p>
              </div>
              <div>
                <Label>Call Objective</Label>
                <Select value={callObjective} onValueChange={setCallObjective}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment_setting">Appointment Setting</SelectItem>
                    <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
                    <SelectItem value="enrollment_followup">Enrollment Follow-Up</SelectItem>
                    <SelectItem value="renewal_reminder">Renewal Reminder</SelectItem>
                    <SelectItem value="survey">Survey / Feedback</SelectItem>
                    <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                    <SelectItem value="general_info">General Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <AbTestField agentId={id} field="voicemail" label="Voicemail Script" currentValue={voicemailScript} onValueChange={setVoicemailScript} />
                <div className="flex items-center gap-3 mt-3">
                  <Switch checked={voicemailEnabled} onCheckedChange={setVoicemailEnabled} />
                  <Label>Leave voicemail on no answer</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Knowledge Base */}
          <Card id="section-knowledge-base">
            <CardHeader><CardTitle className="section-title">Knowledge Base</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Knowledge</Label>
                <Textarea value={knowledgeBase} onChange={e => setKnowledgeBase(e.target.value)} placeholder="Paste your company's key information here..." rows={4} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Call Direction */}
          <Card id="section-call-direction">
            <CardHeader><CardTitle className="section-title">Call Direction</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">What type of calls should this agent handle?</Label>
                <div className="space-y-2">
                  {[
                    { value: "outbound", label: "Outbound only", desc: "This agent calls your leads", icon: PhoneOutgoing },
                    { value: "inbound", label: "Inbound only", desc: "This agent answers calls to your number", icon: PhoneIncoming },
                    { value: "both", label: "Both", desc: "This agent can make and receive calls", icon: Phone },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setCallDirection(opt.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${callDirection === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <opt.icon className={`h-5 w-5 shrink-0 ${callDirection === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {(callDirection === "inbound" || callDirection === "both") && (
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">Inbound Settings</p>
                  <div>
                    <Label>Inbound greeting</Label>
                    <Textarea value={inboundGreeting} onChange={e => setInboundGreeting(e.target.value)} rows={2} className="mt-1" placeholder="Thank you for calling..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Answer after (rings)</Label>
                      <Input type="number" min={1} max={10} value={answerAfterRings} onChange={e => setAnswerAfterRings(Number(e.target.value))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Outside business hours</Label>
                      <Select value={afterHoursBehavior} onValueChange={setAfterHoursBehavior}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="answer">Answer with AI agent</SelectItem>
                          <SelectItem value="voicemail">Play voicemail message</SelectItem>
                          <SelectItem value="forward">Forward to mobile</SelectItem>
                          <SelectItem value="ring">Let it ring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {afterHoursBehavior === "voicemail" && (
                    <div>
                      <Label>After-hours voicemail message</Label>
                      <Textarea value={afterHoursVoicemailMessage} onChange={e => setAfterHoursVoicemailMessage(e.target.value)} rows={3} className="mt-1" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 6: Transfer */}
          <Card id="section-transfer">
            <CardHeader><CardTitle className="section-title">Transfer & Escalation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Transfer phone number</Label><Input value={transferPhone} onChange={e => setTransferPhone(e.target.value)} placeholder="+15550000000" /></div>
                <div><Label>Backup number</Label><Input value={backupTransfer} onChange={e => setBackupTransfer(e.target.value)} placeholder="+15550000001" /></div>
              </div>
              <div>
                <Label>Transfer announcement</Label>
                <Textarea value={transferAnnouncement} onChange={e => setTransferAnnouncement(e.target.value)} rows={2} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Section 8: After the Call */}
          <div id="section-after-call">
            <PostCallActionsSection config={postCallActions} onChange={setPostCallActions} />
          </div>

          {/* Section 9: Compliance */}
          <Card id="section-compliance">
            <CardHeader><CardTitle className="section-title">Compliance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">BenefitPath Voice AI is designed to help you comply with TCPA, TSR, and state telemarketing regulations.</p>
              </div>
              <div className="flex items-center gap-3"><Switch checked={recordCalls} onCheckedChange={setRecordCalls} /><Label>Record all calls</Label></div>
              <div className="flex items-center gap-3"><Switch checked={disclosure} onCheckedChange={setDisclosure} /><Label>Play recording disclosure at start of call</Label></div>
              <div className="flex items-center gap-3"><Switch defaultChecked disabled /><Label>Respect Do-Not-Call requests immediately (required)</Label></div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div id="section-review" className="flex items-center gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save as Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Activate Agent
            </Button>
            {!isNew && existingAgent?.vapi_assistant_id && (
              <Button variant="outline" onClick={() => setShowTestCallDialog(true)}>
                <Phone className="h-4 w-4 mr-2" /> Test Call
              </Button>
            )}
            {!isNew && (
              <Button variant="ghost" className="text-destructive ml-auto" onClick={() => {
                deleteAgent.mutate(id!, { onSuccess: () => navigate("/agents") });
              }} disabled={deleteAgent.isPending}>
                {deleteAgent.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Delete Agent
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Test Call Dialog */}
      <Dialog open={showTestCallDialog} onOpenChange={setShowTestCallDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Call</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your phone number and we'll call you with this agent. This is a free test call.</p>
            <div>
              <Label>Your Phone Number</Label>
              <Input value={testPhoneNumber} onChange={e => setTestPhoneNumber(e.target.value)} placeholder="+15551234567" className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleTestCall} disabled={testCall.isPending}>
              {testCall.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
              Launch Test Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

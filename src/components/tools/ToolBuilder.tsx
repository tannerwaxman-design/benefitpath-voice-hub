import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolPreview } from "./ToolPreview";
import type { ToolTemplate } from "./ToolTemplates";
import type { ToolParameter } from "@/hooks/use-tools";
import { useToolApiKeys, useCreateTool, useAssignToolToAgents } from "@/hooks/use-tools";
import { useAgents } from "@/hooks/use-agents";

const SERVICE_OPTIONS = [
  { value: "ghl", label: "GoHighLevel" },
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "google_calendar", label: "Google Calendar" },
  { value: "custom_webhook", label: "Custom Webhook" },
];

interface ToolBuilderProps {
  template: ToolTemplate;
  onBack: () => void;
  onSaved: () => void;
}

export function ToolBuilder({ template, onBack, onSaved }: ToolBuilderProps) {
  const { data: apiKeys = [] } = useToolApiKeys();
  const { data: agents = [] } = useAgents();
  const createTool = useCreateTool();

  const connectedServices = new Set(apiKeys.map((k) => k.service));

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.defaults.description);
  const [messageStart, setMessageStart] = useState(template.defaults.message_start);
  const [messageComplete, setMessageComplete] = useState(template.defaults.message_complete);
  const [messageFailed, setMessageFailed] = useState(template.defaults.message_failed);
  const [service, setService] = useState(template.defaultService);
  const [parameters, setParameters] = useState<ToolParameter[]>(template.defaults.parameters);
  const [serviceConfig, setServiceConfig] = useState<Record<string, unknown>>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showAssign, setShowAssign] = useState(false);

  // Custom field
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldPrompt, setNewFieldPrompt] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const toggleParam = (index: number) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setParameters(updated);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setParameters([
      ...parameters,
      {
        name: newFieldName.toLowerCase().replace(/\s+/g, "_"),
        label: newFieldName,
        ai_prompt: newFieldPrompt,
        type: "string",
        required: newFieldRequired,
        enabled: true,
      },
    ]);
    setNewFieldName("");
    setNewFieldPrompt("");
    setNewFieldRequired(false);
  };

  const removeParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateServiceConfig = (key: string, value: unknown) => {
    setServiceConfig({ ...serviceConfig, [key]: value });
  };

  const handleSave = async (andAssign = false) => {
    await createTool.mutateAsync({
      name,
      description,
      template: template.id,
      service,
      parameters: parameters.filter((p) => p.enabled) as any,
      message_start: messageStart,
      message_complete: messageComplete,
      message_failed: messageFailed,
      service_config: serviceConfig as any,
      assigned_agent_ids: selectedAgents as any,
      status: "active",
    });
    if (andAssign) {
      setShowAssign(true);
    } else {
      onSaved();
    }
  };

  if (showAssign) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">✅</div>
          <div>
            <h2 className="text-lg font-semibold">Tool Created!</h2>
            <p className="text-sm text-muted-foreground">"{name}" is ready to use.</p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">Which agents should use this tool?</h3>
          {agents.map((agent) => (
            <label key={agent.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={selectedAgents.includes(agent.id)}
                onCheckedChange={(checked) => {
                  setSelectedAgents(checked ? [...selectedAgents, agent.id] : selectedAgents.filter((id) => id !== agent.id));
                }}
              />
              <span className="text-sm font-medium">{agent.agent_name}</span>
              {agent.description && <span className="text-xs text-muted-foreground">— {agent.description}</span>}
            </label>
          ))}
          {agents.length === 0 && <p className="text-sm text-muted-foreground">No agents yet. Create an agent first.</p>}
        </div>
        <div className="flex gap-3">
          <Button onClick={onSaved}>Save Assignments</Button>
          <Button variant="ghost" onClick={onSaved}>Skip for now</Button>
        </div>
      </div>
    );
  }

  const availableServices = SERVICE_OPTIONS.filter(
    (s) => s.value === "custom_webhook" || connectedServices.has(s.value)
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </button>

      {/* Section A: Basics */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Basics</h2>
        <div className="space-y-2">
          <Label>Tool Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Book Appointment on Google Calendar" />
        </div>
        <div className="space-y-2">
          <Label>When should the AI use this tool?</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe in plain English when the AI should trigger this tool..." rows={3} />
        </div>
        <div className="space-y-2">
          <Label>What should the AI say while working on this?</Label>
          <Input value={messageStart} onChange={(e) => setMessageStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>What should the AI say when the tool succeeds?</Label>
          <Input value={messageComplete} onChange={(e) => setMessageComplete(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>What should the AI say if the tool fails?</Label>
          <Input value={messageFailed} onChange={(e) => setMessageFailed(e.target.value)} />
        </div>
      </section>

      {/* Section B: Service */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Where does this connect to?</h2>
        {availableServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Connect an API key first using the bar at the top of the page.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableServices.map((s) => (
              <button
                key={s.value}
                onClick={() => setService(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  service === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                }`}
              >
                {s.label} {connectedServices.has(s.value) && "✓"}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Section C: Parameters */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">What information should the AI collect?</h2>
        <div className="space-y-2">
          {parameters.map((p, i) => (
            <label key={i} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
              <Checkbox checked={p.enabled} onCheckedChange={() => toggleParam(i)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{p.label}</span>
                {p.required && <span className="text-xs text-destructive ml-1">*required</span>}
                {p.ai_prompt && (
                  <p className="text-xs text-muted-foreground mt-0.5">AI will ask: "{p.ai_prompt}"</p>
                )}
              </div>
              <button onClick={() => removeParam(i)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </label>
          ))}
        </div>
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-sm font-medium flex items-center gap-1"><Plus className="h-4 w-4" /> Add custom field</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Field name</Label>
              <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="e.g. Medicare Plan Type" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">AI prompt</Label>
              <Input value={newFieldPrompt} onChange={(e) => setNewFieldPrompt(e.target.value)} placeholder="e.g. What type of Medicare plan?" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={newFieldRequired} onCheckedChange={setNewFieldRequired} />
              <Label className="text-xs">Required?</Label>
            </div>
            <Button size="sm" variant="outline" onClick={addCustomField} disabled={!newFieldName.trim()}>Add Field</Button>
          </div>
        </div>
      </section>

      {/* Section D: Service-specific config */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          {service === "google_calendar" ? "Google Calendar Settings" :
           service === "ghl" ? "GoHighLevel Settings" :
           service === "hubspot" ? "HubSpot Settings" :
           service === "salesforce" ? "Salesforce Settings" :
           "Webhook Settings"}
        </h2>

        {service === "google_calendar" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Calendar</Label>
              <Select value={(serviceConfig.calendar_id as string) || ""} onValueChange={(v) => updateServiceConfig("calendar_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a calendar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="benefits">Benefits Appointments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Appointment duration</Label>
              <Select value={String(serviceConfig.duration_minutes || 30)} onValueChange={(v) => updateServiceConfig("duration_minutes", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!serviceConfig.add_reminder} onCheckedChange={(v) => updateServiceConfig("add_reminder", v)} />
              <Label>Send a reminder email 1 hour before</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!serviceConfig.include_meet_link} onCheckedChange={(v) => updateServiceConfig("include_meet_link", v)} />
              <Label>Include Google Meet link</Label>
            </div>
          </div>
        )}

        {service === "ghl" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Calendar (optional)</Label>
              <Input value={(serviceConfig.calendar_id as string) || ""} onChange={(e) => updateServiceConfig("calendar_id", e.target.value)} placeholder="Enter calendar ID" />
            </div>
            <div className="space-y-2">
              <Label>Pipeline (optional)</Label>
              <Input value={(serviceConfig.pipeline_id as string) || ""} onChange={(e) => updateServiceConfig("pipeline_id", e.target.value)} placeholder="Enter pipeline ID" />
            </div>
            <div className="space-y-2">
              <Label>Contact tags to add</Label>
              <Input value={(serviceConfig.tags as string) || ""} onChange={(e) => updateServiceConfig("tags", e.target.value)} placeholder="Voice AI Lead, Appointment Set" />
            </div>
            <div className="space-y-2">
              <Label>Workflow to trigger (optional)</Label>
              <Input value={(serviceConfig.workflow_id as string) || ""} onChange={(e) => updateServiceConfig("workflow_id", e.target.value)} placeholder="Enter workflow ID" />
            </div>
          </div>
        )}

        {service === "hubspot" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contact owner</Label>
              <Input value={(serviceConfig.owner_id as string) || ""} onChange={(e) => updateServiceConfig("owner_id", e.target.value)} placeholder="Enter HubSpot user ID" />
            </div>
            <div className="space-y-2">
              <Label>Lifecycle stage</Label>
              <Select value={(serviceConfig.lifecycle_stage as string) || "lead"} onValueChange={(v) => updateServiceConfig("lifecycle_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="mql">Marketing Qualified Lead</SelectItem>
                  <SelectItem value="sql">Sales Qualified Lead</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(service === "custom_webhook" || service === "custom") && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input value={(serviceConfig.url as string) || ""} onChange={(e) => updateServiceConfig("url", e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..." />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={(serviceConfig.method as string) || "POST"} onValueChange={(v) => updateServiceConfig("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authorization header (optional)</Label>
              <Input value={(serviceConfig.auth_header as string) || ""} onChange={(e) => updateServiceConfig("auth_header", e.target.value)} placeholder="Bearer your-token-here" />
            </div>
          </div>
        )}
      </section>

      {/* Section E: Preview */}
      <ToolPreview
        name={name}
        service={service}
        messageStart={messageStart}
        messageComplete={messageComplete}
        messageFailed={messageFailed}
        parameters={parameters}
        serviceConfig={serviceConfig}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={() => handleSave(false)} disabled={!name.trim() || createTool.isPending}>
          {createTool.isPending ? "Saving..." : "Save Tool"}
        </Button>
        <Button variant="secondary" onClick={() => handleSave(true)} disabled={!name.trim() || createTool.isPending}>
          Save & Assign to Agent
        </Button>
        <Button variant="ghost" onClick={onBack}>Cancel</Button>
      </div>
    </div>
  );
}

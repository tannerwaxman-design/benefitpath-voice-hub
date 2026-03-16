import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Bell, Wand2 } from "lucide-react";

export interface PostCallActionsConfig {
  post_call_email_enabled: boolean;
  post_call_email_subject: string;
  post_call_email_body: string;
  post_call_email_trigger: string;
  post_call_sms_enabled: boolean;
  post_call_sms_body: string;
  post_call_notification_enabled: boolean;
  post_call_notification_email: string;
  post_call_notification_triggers: string[];
  post_call_notification_includes: string[];
  post_call_task_enabled: boolean;
}

interface Props {
  config: PostCallActionsConfig;
  onChange: (config: PostCallActionsConfig) => void;
}

const DEFAULT_EMAIL_BODY = `Hi {{contact_first_name}},

Thanks for taking the time to speak with us today about your benefits options. As discussed, here's a summary:

{{ai_call_summary}}

{{if_appointment: Your appointment is confirmed for {{appointment_date}} at {{appointment_time}}.}}

If you have any questions before then, feel free to call us at {{company_phone}} or reply to this email.

Best regards,
{{agent_name}}
{{company_name}}`;

const DEFAULT_SMS = `Hi {{contact_first_name}}, thanks for chatting with {{company_name}}! {{ai_call_summary_short}} Reply STOP to opt out.`;

const NOTIFICATION_TRIGGER_OPTIONS = [
  { value: "appointment_booked", label: "Appointment booked" },
  { value: "lead_qualified", label: "Lead qualified but no appointment" },
  { value: "callback_requested", label: "Lead requested callback" },
  { value: "every_completed", label: "Every completed call" },
  { value: "every_failed", label: "Every failed/no-answer call" },
];

const NOTIFICATION_INCLUDE_OPTIONS = [
  { value: "call_summary", label: "Call summary" },
  { value: "contact_info", label: "Contact info" },
  { value: "full_transcript", label: "Full transcript" },
  { value: "recording_link", label: "Recording link" },
];

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

export function PostCallActionsSection({ config, onChange }: Props) {
  const update = (partial: Partial<PostCallActionsConfig>) => onChange({ ...config, ...partial });
  const smsLength = (config.post_call_sms_body || "").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-title">After the Call</CardTitle>
        <p className="text-sm text-muted-foreground">What should happen automatically after each call ends?</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* FOLLOW-UP EMAIL */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Follow-Up Email</h4>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.post_call_email_enabled} onCheckedChange={v => update({ post_call_email_enabled: v })} />
            <Label>Send a follow-up email to the contact after calls</Label>
          </div>
          {config.post_call_email_enabled && (
            <div className="space-y-3 pl-8 border-l-2 border-primary/20">
              <div>
                <Label>Email subject</Label>
                <Input value={config.post_call_email_subject} onChange={e => update({ post_call_email_subject: e.target.value })} placeholder="Thanks for chatting with us!" className="mt-1" />
              </div>
              <div>
                <Label>Email content</Label>
                <Textarea
                  value={config.post_call_email_body || DEFAULT_EMAIL_BODY}
                  onChange={e => update({ post_call_email_body: e.target.value })}
                  rows={12} className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {"{{contact_first_name}}"}, {"{{ai_call_summary}}"}, {"{{agent_name}}"}, {"{{company_name}}"}, {"{{company_phone}}"}
                </p>
              </div>
              <div>
                <Label>Send when</Label>
                <Select value={config.post_call_email_trigger} onValueChange={v => update({ post_call_email_trigger: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_calls">All calls</SelectItem>
                    <SelectItem value="connected_only">Only connected calls</SelectItem>
                    <SelectItem value="appointment_booked">Only when appointment booked</SelectItem>
                    <SelectItem value="not_connected">Only when NOT connected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* FOLLOW-UP SMS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Follow-Up SMS</h4>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.post_call_sms_enabled} onCheckedChange={v => update({ post_call_sms_enabled: v })} />
            <Label>Send a follow-up text message after calls</Label>
          </div>
          {config.post_call_sms_enabled && (
            <div className="space-y-3 pl-8 border-l-2 border-primary/20">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={config.post_call_sms_body || DEFAULT_SMS}
                  onChange={e => update({ post_call_sms_body: e.target.value })}
                  rows={3} className="mt-1" maxLength={320}
                />
                <p className={`text-xs mt-1 ${smsLength > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                  {smsLength} / 160 characters {smsLength > 160 && "(will send as 2 messages)"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* INTERNAL NOTIFICATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Internal Notification</h4>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.post_call_notification_enabled} onCheckedChange={v => update({ post_call_notification_enabled: v })} />
            <Label>Notify me after each call</Label>
          </div>
          {config.post_call_notification_enabled && (
            <div className="space-y-3 pl-8 border-l-2 border-primary/20">
              <div>
                <Label>Send to</Label>
                <Input value={config.post_call_notification_email} onChange={e => update({ post_call_notification_email: e.target.value })} placeholder="you@company.com" className="mt-1" type="email" />
              </div>
              <div>
                <Label className="mb-2 block">Notify when</Label>
                <div className="space-y-2">
                  {NOTIFICATION_TRIGGER_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={config.post_call_notification_triggers.includes(opt.value)}
                        onCheckedChange={() => update({ post_call_notification_triggers: toggleArrayItem(config.post_call_notification_triggers, opt.value) })}
                      />
                      <Label className="font-normal">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Notification includes</Label>
                <div className="space-y-2">
                  {NOTIFICATION_INCLUDE_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={config.post_call_notification_includes.includes(opt.value)}
                        onCheckedChange={() => update({ post_call_notification_includes: toggleArrayItem(config.post_call_notification_includes, opt.value) })}
                      />
                      <Label className="font-normal">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI-GENERATED TASK */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">AI-Generated Task</h4>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.post_call_task_enabled} onCheckedChange={v => update({ post_call_task_enabled: v })} />
            <Label>Create a follow-up task after calls that need action</Label>
          </div>
          {config.post_call_task_enabled && (
            <div className="pl-8 border-l-2 border-primary/20">
              <p className="text-sm text-muted-foreground">
                The AI will analyze each call and decide if a follow-up task is needed. Tasks appear in your dashboard under "AI Follow-Up Tasks".
              </p>
              <div className="mt-3 p-3 rounded-lg bg-secondary/50 space-y-1">
                <p className="text-xs font-medium text-foreground">Example tasks the AI might create:</p>
                <p className="text-xs text-muted-foreground">• "Call back John Martinez on Thursday — he said to try again then"</p>
                <p className="text-xs text-muted-foreground">• "Email Lisa Chen the plan comparison PDF she requested"</p>
                <p className="text-xs text-muted-foreground">• "John mentioned his wife also needs coverage — follow up on that"</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

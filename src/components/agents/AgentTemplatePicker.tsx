import { Star, ClipboardList, RefreshCw, PhoneIncoming, BarChart3, HeartPulse, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AgentTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  description: string;
  popular?: boolean;
  defaults: {
    agent_name: string;
    agent_title: string;
    call_direction: string;
    call_objective: string;
    tone: string;
    enthusiasm_level: number;
    greeting_script: string;
    inbound_greeting: string;
    voicemail_script: string;
    closing_script: string;
    knowledge_base_text: string;
  };
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "medicare_aep",
    name: "Medicare AEP Caller",
    icon: Star,
    iconColor: "text-amber-600 bg-amber-100",
    description: "Outbound agent for Annual Enrollment Period. Calls leads, explains plan options, books consultations.",
    popular: true,
    defaults: {
      agent_name: "Sarah",
      agent_title: "Benefits Specialist",
      call_direction: "outbound",
      call_objective: "appointment_setting",
      tone: "warm",
      enthusiasm_level: 7,
      greeting_script: "Hi {{contact_name}}, this is {{agent_name}} calling from {{company_name}}. I'm reaching out because the Annual Enrollment Period is coming up and I wanted to make sure you have all the information you need to make the best decision for your coverage. Do you have a couple of minutes?",
      inbound_greeting: "",
      voicemail_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I was calling about the upcoming Annual Enrollment Period for Medicare. I'd love to help you review your options — there may be plans that save you money or offer better coverage. Please call us back at your convenience. Have a great day!",
      closing_script: "Thank you so much for your time today, {{contact_name}}. I'll send over that plan comparison we discussed. If any questions come up before our appointment, don't hesitate to call us back. Have a wonderful day!",
      knowledge_base_text: "Medicare Annual Enrollment Period (AEP) runs from October 15 through December 7 each year. During AEP, beneficiaries can switch Medicare Advantage plans, return to Original Medicare, join or drop a Part D prescription drug plan. Changes take effect January 1.",
    },
  },
  {
    id: "enrollment_followup",
    name: "Enrollment Follow-Up",
    icon: ClipboardList,
    iconColor: "text-blue-600 bg-blue-100",
    description: "Follow up with leads who started but didn't complete their enrollment. Helps them finish.",
    defaults: {
      agent_name: "James",
      agent_title: "Enrollment Coordinator",
      call_direction: "outbound",
      call_objective: "appointment_setting",
      tone: "professional",
      enthusiasm_level: 6,
      greeting_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I noticed you started looking into your benefits enrollment recently but it looks like you didn't get a chance to finish. I wanted to check in and see if you had any questions I could help with?",
      inbound_greeting: "",
      voicemail_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I'm following up on your recent enrollment inquiry. We want to make sure you don't miss any deadlines. Give us a call back when you have a moment and we'll get you taken care of.",
      closing_script: "Great, I'm glad we could get that sorted out. I'll send you a confirmation with everything we discussed. If anything else comes up, just give us a call. Take care!",
      knowledge_base_text: "",
    },
  },
  {
    id: "policy_renewal",
    name: "Policy Renewal Reminder",
    icon: RefreshCw,
    iconColor: "text-green-600 bg-green-100",
    description: "Call existing clients about upcoming policy renewals. Review current coverage and discuss changes.",
    defaults: {
      agent_name: "Maria",
      agent_title: "Renewal Specialist",
      call_direction: "outbound",
      call_objective: "appointment_setting",
      tone: "warm",
      enthusiasm_level: 5,
      greeting_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I'm calling because your current policy is coming up for renewal and I wanted to make sure we review your options together. There may be some changes that could benefit you. Do you have a few minutes?",
      inbound_greeting: "",
      voicemail_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. Your policy renewal is coming up soon and I'd love to review your options with you. Please call us back so we can make sure you have the best coverage for your needs.",
      closing_script: "Thank you for taking the time to review your renewal options, {{contact_name}}. I'll have that updated quote sent to you by end of day. Don't hesitate to reach out if you have any questions.",
      knowledge_base_text: "",
    },
  },
  {
    id: "inbound_receptionist",
    name: "Inbound Receptionist",
    icon: PhoneIncoming,
    iconColor: "text-purple-600 bg-purple-100",
    description: "Answers incoming calls to your number. Greets callers, answers FAQs, routes to you when needed.",
    defaults: {
      agent_name: "Alex",
      agent_title: "Virtual Receptionist",
      call_direction: "inbound",
      call_objective: "information",
      tone: "professional",
      enthusiasm_level: 6,
      greeting_script: "",
      inbound_greeting: "Thank you for calling {{company_name}}. My name is {{agent_name}}. How can I help you today?",
      voicemail_script: "Thank you for calling {{company_name}}. Our office is currently closed. Our hours are Monday through Friday, 9am to 5pm Eastern. Please leave a message and we'll return your call on the next business day.",
      closing_script: "Thank you for calling {{company_name}}, {{contact_name}}. Is there anything else I can help you with today? Great — have a wonderful day!",
      knowledge_base_text: "",
    },
  },
  {
    id: "survey_feedback",
    name: "Survey & Feedback",
    icon: BarChart3,
    iconColor: "text-orange-600 bg-orange-100",
    description: "Call clients to collect satisfaction data, NPS scores, or feedback on their recent experience.",
    defaults: {
      agent_name: "David",
      agent_title: "Client Experience Associate",
      call_direction: "outbound",
      call_objective: "information",
      tone: "friendly",
      enthusiasm_level: 7,
      greeting_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I hope I'm catching you at a good time! I'm reaching out because we value your feedback and I'd love to ask you a few quick questions about your recent experience with us. It'll only take about two minutes.",
      inbound_greeting: "",
      voicemail_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. We'd love to hear about your recent experience with us. When you have a moment, please give us a call back — it'll only take a couple of minutes. Thank you!",
      closing_script: "Thank you so much for sharing your feedback, {{contact_name}}. Your input really helps us improve. We appreciate your time and your business. Have a great day!",
      knowledge_base_text: "",
    },
  },
  {
    id: "benefits_checkin",
    name: "Benefits Check-In",
    icon: HeartPulse,
    iconColor: "text-rose-600 bg-rose-100",
    description: "Proactive outreach to check if clients are happy with their current benefits and if anything changed.",
    defaults: {
      agent_name: "Rachel",
      agent_title: "Benefits Advisor",
      call_direction: "outbound",
      call_objective: "appointment_setting",
      tone: "warm",
      enthusiasm_level: 6,
      greeting_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I'm just checking in to see how things are going with your current benefits plan. Have there been any changes in your situation — like new medications, a new doctor, or anything else — that might affect your coverage? I want to make sure you're still getting the best value.",
      inbound_greeting: "",
      voicemail_script: "Hi {{contact_name}}, this is {{agent_name}} from {{company_name}}. I'm reaching out to do a quick benefits check-in. If anything has changed in your health or coverage needs, we may be able to find you a better plan. Give us a call back when you have a moment!",
      closing_script: "I'm glad we had a chance to touch base, {{contact_name}}. It sounds like everything is on track, but remember we're always here if anything changes. Take care!",
      knowledge_base_text: "",
    },
  },
];

interface AgentTemplatePickerProps {
  onSelect: (template: AgentTemplate | null) => void;
}

export function AgentTemplatePicker({ onSelect }: AgentTemplatePickerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create a New Agent</h1>
        <p className="text-muted-foreground mt-1">Start with a template or build from scratch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_TEMPLATES.map((t) => (
          <Card
            key={t.id}
            className="hover:border-primary hover:shadow-md transition-all cursor-pointer group relative"
            onClick={() => onSelect(t)}
          >
            {t.popular && (
              <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 text-[10px]">
                Most Popular
              </Badge>
            )}
            <CardContent className="p-5">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${t.iconColor}`}>
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
              <span className="text-xs font-medium text-primary">Use Template →</span>
            </CardContent>
          </Card>
        ))}

        {/* Blank */}
        <Card
          className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
          onClick={() => onSelect(null)}
        >
          <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[180px]">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3 bg-muted text-muted-foreground">
              <Pencil className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Start From Scratch</h3>
            <p className="text-sm text-muted-foreground">Build a custom agent with a blank form.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Calendar, UserPlus, FileEdit, Mail, Bell, Zap, Wrench } from "lucide-react";
import type { ToolParameter } from "@/hooks/use-tools";

export interface ToolTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  description: string;
  worksWithLabel: string;
  defaultService: string;
  defaults: {
    description: string;
    message_start: string;
    message_complete: string;
    message_failed: string;
    parameters: ToolParameter[];
  };
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  {
    id: "book_appointment",
    name: "Book Appointment",
    icon: Calendar,
    iconColor: "text-blue-600 bg-blue-100",
    description: "The AI checks your availability and books directly on your calendar.",
    worksWithLabel: "Google Calendar, GHL",
    defaultService: "google_calendar",
    defaults: {
      description: "Use this tool when the caller wants to schedule an appointment or consultation.",
      message_start: "Let me check my availability and get that booked for you. One moment...",
      message_complete: "Great, you're all set! I've booked that appointment for you.",
      message_failed: "I wasn't able to book that right now, but I'll make sure someone follows up with you.",
      parameters: [
        { name: "preferred_date", label: "Preferred date and time", ai_prompt: "What day works best for you?", type: "string", required: true, enabled: true },
        { name: "contact_name", label: "Contact name", ai_prompt: "May I have your full name?", type: "string", required: true, enabled: true },
        { name: "contact_phone", label: "Contact phone number", ai_prompt: "", type: "string", required: false, enabled: true },
        { name: "contact_email", label: "Contact email", ai_prompt: "What's the best email to send a confirmation to?", type: "string", required: false, enabled: true },
        { name: "reason", label: "Reason for appointment", ai_prompt: "What would you like to discuss?", type: "string", required: false, enabled: false },
        { name: "insurance_type", label: "Insurance type", ai_prompt: "What type of insurance are you looking for?", type: "string", required: false, enabled: false },
      ],
    },
  },
  {
    id: "create_contact",
    name: "Create CRM Contact",
    icon: UserPlus,
    iconColor: "text-green-600 bg-green-100",
    description: "After a call, the AI creates a new contact in your CRM with the lead's info.",
    worksWithLabel: "GHL, HubSpot, Salesforce",
    defaultService: "ghl",
    defaults: {
      description: "Use this tool to create a new contact in the CRM after gathering their information.",
      message_start: "Let me save your information so we can follow up with you.",
      message_complete: "I've got all your info saved. Someone from our team will be in touch.",
      message_failed: "I wasn't able to save that right now, but we'll make sure to follow up.",
      parameters: [
        { name: "first_name", label: "First name", ai_prompt: "What's your first name?", type: "string", required: true, enabled: true },
        { name: "last_name", label: "Last name", ai_prompt: "And your last name?", type: "string", required: true, enabled: true },
        { name: "phone", label: "Phone number", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "email", label: "Email address", ai_prompt: "What's your email address?", type: "string", required: false, enabled: true },
        { name: "dob", label: "Date of birth", ai_prompt: "May I have your date of birth?", type: "string", required: false, enabled: false },
        { name: "insurance_provider", label: "Current insurance provider", ai_prompt: "Who is your current insurance provider?", type: "string", required: false, enabled: false },
        { name: "dependents", label: "Number of dependents", ai_prompt: "How many dependents do you have?", type: "string", required: false, enabled: false },
        { name: "zip_code", label: "Zip code", ai_prompt: "What's your zip code?", type: "string", required: false, enabled: false },
      ],
    },
  },
  {
    id: "update_contact",
    name: "Update CRM Record",
    icon: FileEdit,
    iconColor: "text-orange-600 bg-orange-100",
    description: "The AI updates an existing contact's info in your CRM based on the call.",
    worksWithLabel: "GHL, HubSpot, Salesforce",
    defaultService: "ghl",
    defaults: {
      description: "Use this tool to update an existing contact record in the CRM with new information from the call.",
      message_start: "Let me update your records with that information.",
      message_complete: "Your records have been updated.",
      message_failed: "I wasn't able to update that right now, but I'll make sure it gets taken care of.",
      parameters: [
        { name: "contact_phone", label: "Phone number (to find record)", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "field_to_update", label: "Field to update", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "new_value", label: "New value", ai_prompt: "", type: "string", required: true, enabled: true },
      ],
    },
  },
  {
    id: "send_followup",
    name: "Send Follow-Up",
    icon: Mail,
    iconColor: "text-purple-600 bg-purple-100",
    description: "After the call, send the lead an email or text with next steps.",
    worksWithLabel: "GHL, Custom Webhook",
    defaultService: "ghl",
    defaults: {
      description: "Use this tool to send a follow-up email or text to the caller after the conversation.",
      message_start: "I'll send you the details right after our call.",
      message_complete: "I've queued that up for you. You should receive it shortly.",
      message_failed: "I wasn't able to send that automatically, but our team will follow up with you.",
      parameters: [
        { name: "contact_name", label: "Contact name", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "contact_email", label: "Email address", ai_prompt: "What email should I send the details to?", type: "string", required: true, enabled: true },
        { name: "message_summary", label: "Summary of what to send", ai_prompt: "", type: "string", required: false, enabled: true },
      ],
    },
  },
  {
    id: "notify",
    name: "Notify Me",
    icon: Bell,
    iconColor: "text-yellow-600 bg-yellow-100",
    description: "Get a text or email notification when something happens on a call.",
    worksWithLabel: "Any",
    defaultService: "custom_webhook",
    defaults: {
      description: "Use this tool to send an internal notification when an important event occurs during a call.",
      message_start: "I'm letting our team know about this right away.",
      message_complete: "Our team has been notified.",
      message_failed: "I wasn't able to notify the team automatically, but I've made a note.",
      parameters: [
        { name: "call_summary", label: "Call summary", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "contact_name", label: "Contact name and phone", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "urgency", label: "Urgency level", ai_prompt: "", type: "string", required: false, enabled: true },
      ],
    },
  },
  {
    id: "custom_webhook",
    name: "Custom Webhook",
    icon: Zap,
    iconColor: "text-indigo-600 bg-indigo-100",
    description: "Send call data to any URL. Connect to Zapier, Make, or your own system.",
    worksWithLabel: "Any URL",
    defaultService: "custom_webhook",
    defaults: {
      description: "Use this tool to send data to an external system via webhook.",
      message_start: "One moment while I process that for you.",
      message_complete: "Done! That's been taken care of.",
      message_failed: "I ran into an issue, but our team will follow up.",
      parameters: [
        { name: "call_summary", label: "Call summary", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "transcript", label: "Call transcript", ai_prompt: "", type: "string", required: false, enabled: true },
        { name: "contact_info", label: "Contact name and phone", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "outcome", label: "Call outcome", ai_prompt: "", type: "string", required: true, enabled: true },
        { name: "duration", label: "Call duration", ai_prompt: "", type: "string", required: false, enabled: true },
        { name: "sentiment", label: "Sentiment score", ai_prompt: "", type: "string", required: false, enabled: false },
        { name: "appointment_details", label: "Appointment details (if booked)", ai_prompt: "", type: "string", required: false, enabled: false },
        { name: "recording_url", label: "Full call recording URL", ai_prompt: "", type: "string", required: false, enabled: false },
      ],
    },
  },
];

export const BLANK_TEMPLATE: ToolTemplate = {
  id: "custom",
  name: "Build From Scratch",
  icon: Wrench,
  iconColor: "text-slate-600 bg-slate-100",
  description: "Create a completely custom tool. For advanced users who know their API.",
  worksWithLabel: "",
  defaultService: "custom_webhook",
  defaults: {
    description: "",
    message_start: "",
    message_complete: "",
    message_failed: "",
    parameters: [],
  },
};

interface ToolTemplatePickerProps {
  onSelect: (template: ToolTemplate) => void;
}

export function ToolTemplatePicker({ onSelect }: ToolTemplatePickerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Start with a template</h2>
        <p className="text-sm text-muted-foreground">Pick what kind of tool you want to create. We'll pre-fill everything for you.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="text-left rounded-lg border bg-card p-5 hover:border-primary hover:shadow-md transition-all group"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${t.iconColor}`}>
              <t.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
            {t.worksWithLabel && (
              <p className="text-xs text-muted-foreground">Works with: {t.worksWithLabel}</p>
            )}
          </button>
        ))}
        <button
          onClick={() => onSelect(BLANK_TEMPLATE)}
          className="text-left rounded-lg border border-dashed bg-card p-5 hover:border-primary hover:shadow-md transition-all group"
        >
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${BLANK_TEMPLATE.iconColor}`}>
            <BLANK_TEMPLATE.icon className="h-5 w-5" />
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{BLANK_TEMPLATE.name}</h3>
          <p className="text-sm text-muted-foreground">{BLANK_TEMPLATE.description}</p>
        </button>
      </div>
    </div>
  );
}

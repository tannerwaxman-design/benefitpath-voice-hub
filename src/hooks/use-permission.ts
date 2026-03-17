import { useAuth } from "@/contexts/AuthContext";

const PERMISSIONS: Record<string, string[]> = {
  // Agents
  "agents.create": ["owner", "admin", "manager"],
  "agents.edit": ["owner", "admin", "manager"],
  "agents.delete": ["owner", "admin"],
  "agents.test_call": ["owner", "admin", "manager"],
  // Voices
  "voices.clone": ["owner", "admin", "manager"],
  "voices.delete": ["owner", "admin"],
  // Campaigns
  "campaigns.create": ["owner", "admin", "manager"],
  "campaigns.launch": ["owner", "admin", "manager"],
  "campaigns.delete": ["owner", "admin"],
  // Contacts
  "contacts.upload": ["owner", "admin", "manager"],
  "contacts.delete": ["owner", "admin"],
  "contacts.manage_dnc": ["owner", "admin", "manager"],
  // Call Logs
  "calls.flag": ["owner", "admin", "manager"],
  "calls.note": ["owner", "admin", "manager"],
  // Analytics
  "data.export": ["owner", "admin", "manager"],
  // Tools
  "tools.create": ["owner", "admin"],
  "tools.connect": ["owner", "admin"],
  "tools.delete": ["owner", "admin"],
  // Phone Numbers
  "phone.provision": ["owner", "admin"],
  "phone.release": ["owner"],
  // Team
  "team.view": ["owner", "admin"],
  "team.invite": ["owner", "admin"],
  "team.remove": ["owner", "admin"],
  "team.change_role": ["owner", "admin"],
  // Billing
  "billing.view": ["owner"],
  "billing.change": ["owner"],
  // Settings
  "settings.edit": ["owner", "admin"],
  // Knowledge Base
  "knowledge.edit": ["owner", "admin", "manager"],
};

export function usePermission(action: string): boolean {
  const { user } = useAuth();
  const role = user?.role || "viewer";
  return PERMISSIONS[action]?.includes(role) ?? false;
}

export function useRole(): string {
  const { user } = useAuth();
  return user?.role || "viewer";
}

// Plan-based team size limits
export const PLAN_TEAM_LIMITS: Record<string, number> = {
  voice_ai_starter: 1,
  voice_ai_pro: 3,
  voice_ai_enterprise: 10,
};

export function useTeamLimit(): { limit: number; planName: string } {
  const { user } = useAuth();
  const plan = user?.tenant?.plan || "voice_ai_starter";
  return {
    limit: PLAN_TEAM_LIMITS[plan] ?? 1,
    planName: plan,
  };
}

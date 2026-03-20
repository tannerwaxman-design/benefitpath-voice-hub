import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  agents: "Agents",
  campaigns: "Campaigns",
  contacts: "Contacts",
  leads: "Leads",
  "call-logs": "Call Logs",
  coaching: "Coaching",
  training: "Training",
  analytics: "Analytics",
  "phone-numbers": "Phone Numbers",
  billing: "Billing",
  team: "Team",
  settings: "Settings",
  voices: "Voices",
  "knowledge-base": "Knowledge Base",
  tools: "Tools",
  forge: "Forge",
  "api-docs": "API Docs",
  new: "New",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null; // Don't show on top-level pages

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = routeLabels[segment] || (segment.length > 8 ? segment.slice(0, 8) + "..." : segment);
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pathNames: Record<string, string> = {
  "/": "Overview",
  "/agents": "Agent Builder",
  "/campaigns": "Campaigns",
  "/contacts": "Contact Lists",
  "/call-logs": "Call Logs",
  "/analytics": "Analytics",
  "/phone-numbers": "Phone Numbers",
  "/settings": "Settings",
};

export function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const title = pathNames[location.pathname] || "Dashboard";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">BenefitPath</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search..." className="pl-9 pr-4 py-2 text-sm bg-secondary/50 rounded-md border-0 focus:ring-2 focus:ring-primary/30 outline-none w-64" />
        </div>
        <button className="relative p-2 rounded-md hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">MT</AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.email ?? ""}</p>
            <p className="text-xs text-muted-foreground">{user?.tenant?.company_name ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

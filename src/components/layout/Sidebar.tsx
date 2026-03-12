import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Bot, Megaphone, Users, Phone, BarChart3, Hash, Settings, ChevronLeft
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Agent Builder", icon: Bot, path: "/agents" },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Contact Lists", icon: Users, path: "/contacts" },
  { label: "Call Logs", icon: Phone, path: "/call-logs" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Phone Numbers", icon: Hash, path: "/phone-numbers" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const usagePercent = (user.minutesUsed / user.minutesLimit) * 100;
  const usageColor = usagePercent > 90 ? "bg-destructive" : usagePercent > 70 ? "bg-warning" : "bg-success";

  return (
    <aside className={`${collapsed ? "w-16" : "w-[260px]"} bg-slate-900 text-slate-400 flex flex-col min-h-screen transition-all duration-200 shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">BenefitPath</span>
            <span className="text-[10px] font-semibold bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded" style={{ color: "#818CF8" }}>Voice AI</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-500 hover:text-white transition-colors p-1">
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => {
          const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active ? "bg-slate-800 text-white border-l-2 border-primary" : "hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Usage Meter */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Minutes Used</p>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full transition-all ${usageColor}`} style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="text-xs text-slate-500">{user.minutesUsed.toLocaleString()} / {user.minutesLimit.toLocaleString()} min</p>
          <button className="text-xs text-primary mt-1 hover:underline" style={{ color: "#818CF8" }}>Upgrade Plan</button>
        </div>
      )}
    </aside>
  );
}

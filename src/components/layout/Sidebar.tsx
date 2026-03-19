import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-permission";
import {
  LayoutDashboard, Bot, AudioLines, Megaphone, Users, Phone, BarChart3, Hash, Settings, ChevronLeft, Wrench, CreditCard, BookOpen, UsersRound, GraduationCap, Flame, Thermometer
} from "lucide-react";
import logo from "@/assets/benefit_path_icon.svg";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles?: string[];
  badge?: string;
  accentIcon?: boolean;
}

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Forge", icon: Flame, path: "/forge", badge: "AI", accentIcon: true },
  { label: "Agent Builder", icon: Bot, path: "/agents" },
  { label: "Voices", icon: AudioLines, path: "/voices" },
  { label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base", roles: ["owner", "admin", "manager"] },
  { label: "Tools", icon: Wrench, path: "/tools", roles: ["owner", "admin"] },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Contact Lists", icon: Users, path: "/contacts" },
  { label: "Leads", icon: Thermometer, path: "/leads" },
  { label: "Call Logs", icon: Phone, path: "/call-logs" },
  { label: "Training", icon: GraduationCap, path: "/training", roles: ["owner", "admin", "manager"] },
  { label: "Coaching", icon: BookOpen, path: "/coaching", roles: ["owner", "admin", "manager"] },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Phone Numbers", icon: Hash, path: "/phone-numbers", roles: ["owner", "admin"] },
  { label: "Team", icon: UsersRound, path: "/team", roles: ["owner", "admin"] },
  { label: "Billing & Usage", icon: CreditCard, path: "/billing", roles: ["owner"] },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const creditBalance = user?.tenant?.credit_balance ?? 0;

  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(role));

  return (
    <aside className={`${collapsed ? "w-16" : "w-[260px]"} bg-slate-900 text-slate-400 flex flex-col min-h-screen transition-all duration-200 shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src={logo} alt="BenefitPath" className="h-8 w-auto" />
          {!collapsed && (
            <>
              <span className="text-lg font-bold text-white tracking-tight">BenefitPath</span>
              <span className="text-[10px] font-semibold bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded" style={{ color: "#818CF8" }}>Voice AI</span>
            </>
          )}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-500 hover:text-white transition-colors p-1">
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {visibleItems.map(item => {
          const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active ? "bg-slate-800 text-white border-l-2 border-primary" : "hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${item.accentIcon ? "text-amber-400" : ""}`} />
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      {!collapsed && user?.tenant && (
        <div className="p-4 border-t border-slate-800">
          {(() => {
            const balance = user.tenant.credit_balance ?? 0;
            const autoRefill = user.tenant.auto_refill_enabled;
            const isZero = balance === 0;
            const isLow = balance > 0 && balance < 200;
            return (
              <>
                <p className="text-xs text-slate-500 mb-1">Credits</p>
                <p className={`text-sm font-bold ${isZero ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}`}>
                  {isZero ? "🔴" : isLow ? "⚠️" : "💰"} {balance.toLocaleString()} remaining
                </p>
                {isZero && <p className="text-[10px] text-red-400 mt-0.5">Calling paused</p>}
                {autoRefill && !isZero && (
                  <p className="text-[10px] text-slate-500 mt-0.5">🔄 Auto-refill ON</p>
                )}
                <button onClick={() => navigate("/billing")} className="text-xs mt-1.5 hover:underline" style={{ color: "#818CF8" }}>
                  {isZero || isLow ? "Buy Credits Now" : "Buy Credits"}
                </button>
              </>
            );
          })()}
        </div>
      )}
    </aside>
  );
}

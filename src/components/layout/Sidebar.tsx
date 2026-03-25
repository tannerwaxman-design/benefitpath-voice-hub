import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-permission";
import { ContextualHelp } from "@/components/onboarding/ContextualHelp";
import {
  LayoutDashboard, Radio, Bot, AudioLines, Megaphone, Users, Phone, BarChart3, Hash, Settings, ChevronLeft, Wrench, BookOpen, UsersRound, GraduationCap, Flame, Thermometer, FileCode, DollarSign
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

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/" },
      { label: "War Room", icon: Radio, path: "/war-room", badge: "LIVE" },
    ],
  },
  {
    title: "CREATE",
    items: [
      { label: "Forge", icon: Flame, path: "/forge", badge: "AI", accentIcon: true },
      { label: "Agent Builder", icon: Bot, path: "/agents" },
      { label: "Voices", icon: AudioLines, path: "/voices" },
      { label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base", roles: ["owner", "admin", "manager"] },
      { label: "Tools", icon: Wrench, path: "/tools", roles: ["owner", "admin"] },
    ],
  },
  {
    title: "LAUNCH",
    items: [
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
      { label: "Contact Lists", icon: Users, path: "/contacts" },
      { label: "Phone Numbers", icon: Hash, path: "/phone-numbers", roles: ["owner", "admin"] },
    ],
  },
  {
    title: "OBSERVE",
    items: [
      { label: "Leads", icon: Thermometer, path: "/leads" },
      { label: "Call Logs", icon: Phone, path: "/call-logs" },
      { label: "Training", icon: GraduationCap, path: "/training", roles: ["owner", "admin", "manager"] },
      { label: "Coaching", icon: BookOpen, path: "/coaching", roles: ["owner", "admin", "manager"] },
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { label: "Team", icon: UsersRound, path: "/team", roles: ["owner", "admin"] },
      { label: "Settings", icon: Settings, path: "/settings" },
      { label: "API Docs", icon: FileCode, path: "/api-docs", roles: ["owner", "admin"] },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = useRole();
  const [collapsed, setCollapsed] = useState(false);

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
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navSections.map((section, si) => {
          const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className={si > 0 ? "mt-4" : "mt-1"}>
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && si > 0 && (
                <div className="mx-2 mb-2 border-t border-slate-800" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
                  return (
                    <Link key={item.path} to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        active ? "bg-slate-800 text-white border-l-2 border-primary" : "hover:bg-slate-800/50 hover:text-white"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={`h-5 w-5 shrink-0 ${item.accentIcon ? "text-amber-400" : ""}`} />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.badge === "LIVE" ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          ) : item.badge ? (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Balance */}
      {user?.tenant && (
        <div className="p-4 border-t border-slate-800">
          {!collapsed && (
            <div className="px-1 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">BALANCE</span>
            </div>
          )}
          {(() => {
            const balance = user.tenant.credit_balance ?? 0;
            const isZero = balance === 0;
            const isLow = balance > 0 && balance < 200;
            return collapsed ? (
              <button onClick={() => navigate("/billing")} className="flex items-center justify-center w-full" title={`$${balance.toLocaleString()} balance`}>
                <DollarSign className={`h-5 w-5 ${isZero ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}`} />
              </button>
            ) : (
              <>
                <p className={`text-sm font-bold ${isZero ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}`}>
                  💰 ${balance.toLocaleString()}
                </p>
                {isZero && <p className="text-[10px] text-red-400 mt-0.5">Calling paused</p>}
                <button onClick={() => navigate("/billing")} className="text-xs mt-1.5 hover:underline" style={{ color: "#818CF8" }}>
                  {isZero || isLow ? "Add Funds Now" : "Add Funds"}
                </button>
              </>
            );
          })()}
        </div>
      )}
    </aside>
  );
}

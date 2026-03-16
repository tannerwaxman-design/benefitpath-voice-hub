import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Bot, Megaphone, Users, Phone, BarChart3, Hash, Settings, ChevronLeft, Wrench, CreditCard, BookOpen, UsersRound
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/benefit_path_icon.svg";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/" },
  { label: "Agent Builder", icon: Bot, path: "/agents" },
  { label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base" },
  { label: "Tools", icon: Wrench, path: "/tools" },
  { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { label: "Contact Lists", icon: Users, path: "/contacts" },
  { label: "Call Logs", icon: Phone, path: "/call-logs" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Phone Numbers", icon: Hash, path: "/phone-numbers" },
  { label: "Billing & Usage", icon: CreditCard, path: "/billing" },
  { label: "Team", icon: UsersRound, path: "/team" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const creditBalance = user?.tenant?.credit_balance ?? 0;

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
          <p className="text-xs text-slate-500 mb-2">Credit Balance</p>
          <p className={`text-lg font-bold ${creditBalance <= 1 ? "text-red-400" : creditBalance <= 5 ? "text-yellow-400" : "text-emerald-400"}`}>
            ${creditBalance.toFixed(2)}
          </p>
          <button onClick={() => navigate("/settings")} className="text-xs text-primary mt-1 hover:underline" style={{ color: "#818CF8" }}>Add Credits</button>
        </div>
      )}
    </aside>
  );
}

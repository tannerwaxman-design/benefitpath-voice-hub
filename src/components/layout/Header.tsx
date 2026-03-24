import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Search, LogOut, Settings, CheckCheck, Phone, Megaphone, AlertTriangle, Info, Bot, BarChart3, Users, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { useGlobalSearch, type SearchResult } from "@/hooks/use-global-search";

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

const iconMap: Record<string, typeof Bell> = {
  phone: Phone,
  campaign: Megaphone,
  warning: AlertTriangle,
  info: Info,
  bell: Bell,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const Icon = iconMap[notification.icon] || Bell;
  const typeColors: Record<string, string> = {
    success: "text-emerald-500",
    error: "text-destructive",
    warning: "text-yellow-500",
    info: "text-primary",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex gap-3 items-start border-b border-border last:border-0 ${
        !notification.read ? "bg-primary/5" : ""
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${typeColors[notification.type] || "text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${!notification.read ? "font-semibold text-foreground" : "text-foreground"}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
      </div>
    </button>
  );
}

const searchTypeIcons: Record<string, typeof Bot> = {
  agent: Bot,
  campaign: Megaphone,
  contact: Users,
  call: Phone,
};

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = pathNames[location.pathname] || "Dashboard";
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { results, isSearching } = useGlobalSearch(searchQuery);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        input?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchResultClick = (result: SearchResult) => {
    navigate(result.link);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "??";

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">BenefitPath</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search... (Ctrl+K)"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="pl-9 pr-4 py-2 text-sm bg-secondary/50 rounded-md border-0 focus:ring-2 focus:ring-primary/30 outline-none w-64"
          />
          {searchOpen && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
              {isSearching ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-80 overflow-auto">
                  {results.map(result => {
                    const Icon = searchTypeIcons[result.type] || Search;
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 flex items-center gap-3 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.type} &middot; {result.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h4>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll see call alerts and campaign updates here.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                  />
                ))}
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-md p-1.5 hover:bg-secondary transition-colors outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground leading-none">{user?.email ?? ""}</p>
                <p className="text-xs text-muted-foreground">{user?.tenant?.company_name ?? ""}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Zap,
  Activity,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUsageGate } from "@/hooks/useUsageGate";
import { Key } from "lucide-react";

const primaryNav = [
  { name: "Orchestrator", href: "/tool-orchestrator", icon: Zap },
  { name: "Evals", href: "/eval", icon: Sparkles },
  { name: "Traces", href: "/trace", icon: Activity },
  { name: "Tool Hub", href: "/tools", icon: Package },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function SeerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { remainingFreeQueries, hasApiKey, isLoading: usageLoading } = useUsageGate();

  const NavItem = ({ item, isActive }: { item: typeof primaryNav[0]; isActive: boolean }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap"
            >
              {item.name}
            </motion.span>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="font-medium">
          {item.name}
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0"
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center">
            <Search className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-foreground"
            >
              Seer
            </motion.span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {primaryNav.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="px-2 py-2 space-y-1 border-t border-sidebar-border">
        {secondaryNav.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href}
          />
        ))}
      </div>

      {/* Theme Switcher */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
          <ThemeSwitcher />
          {!collapsed && (
            <span className="text-xs text-muted-foreground">Theme</span>
          )}
        </div>
      </div>

      {/* Usage Badge */}
      {!usageLoading && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          {hasApiKey ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn(
                  "w-full justify-center text-xs border-success/30 bg-success/10 text-success",
                  collapsed && "w-auto"
                )}>
                  {collapsed ? (
                    <Key className="h-3 w-3" />
                  ) : (
                    <>
                      <Key className="h-3 w-3 mr-1" />
                      API Key Active
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>API Key Active</p>
                </TooltipContent>
              )}
            </Tooltip>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn(
                  "w-full justify-center text-xs border-warning/30 bg-warning/10 text-warning",
                  collapsed && "w-auto"
                )}>
                  {collapsed ? (
                    <span>{remainingFreeQueries}</span>
                  ) : (
                    <>
                      {remainingFreeQueries} free {remainingFreeQueries === 1 ? 'query' : 'queries'} left
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>{remainingFreeQueries} free {remainingFreeQueries === 1 ? 'query' : 'queries'} left</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      )}

      {/* User Profile */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "justify-center" : "px-2"
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-accent text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

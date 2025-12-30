import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Activity,
  Settings,
  LogOut,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClerk, useUser } from "@clerk/clerk-react";

const primaryNav = [
  { name: "Workflows", href: "/workflows", icon: Workflow },
  { name: "Traces", href: "/traces", icon: Activity }
] as const;

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

type NavItemType = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface SeerSidebarProps {
  collapsed?: boolean;
  forceCollapsed?: boolean;
}

export function SeerSidebar({ collapsed: externalCollapsed, forceCollapsed }: SeerSidebarProps) {
  const collapsed = forceCollapsed ? true : (externalCollapsed ?? false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const location = useLocation();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  const NavItem = ({ item, isActive }: { item: NavItemType; isActive: boolean }) => {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.href}
            className={cn(
              "w-full flex items-center justify-start gap-3 min-w-0 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap truncate min-w-0 flex-1"
            >
              {item.name}
            </motion.span>
          </NavLink>
        </TooltipTrigger>
      </Tooltip>
    );
  };

  // When collapsed, render nothing (0 width) - controlled by hamburger menu in top bar
  if (collapsed) {
    return null;
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed inset-y-0 left-0 z-10 h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center">
            <Search className="h-4 w-4 text-white" />
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-semibold text-foreground"
          >
            Seer
          </motion.span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto text-left">
        {primaryNav.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="px-3 py-2 space-y-1 border-t border-sidebar-border text-left">
        {secondaryNav.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href}
          />
        ))}
        {/* Theme Switcher */}
        <div className="w-full flex items-center justify-start gap-3 min-w-0 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left text-muted-foreground hover:text-foreground hover:bg-accent/50">
          <div className="shrink-0">
            <ThemeSwitcher className="h-4 w-4 p-0 hover:bg-transparent" />
          </div>
          <span className="whitespace-nowrap truncate min-w-0 flex-1">Theme</span>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-3 px-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-accent text-xs">
              {(userEmail?.charAt(0) || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.fullName || userEmail?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}

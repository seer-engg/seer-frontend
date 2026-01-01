import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SeerSidebar } from "@/components/seer/SeerSidebar";
import { OnboardingTour } from "@/components/OnboardingTour";

interface SeerLayoutProps {
  children: React.ReactNode;
}

export function SeerLayout({ children }: SeerLayoutProps) {
  const location = useLocation();
  const isWorkflowsPage = location.pathname === '/workflows' || location.pathname.startsWith('/workflows/');
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('seerSidebarCollapsed');
    return saved ? JSON.parse(saved) : false; // Default to expanded for all pages
  });

  // Listen for sidebar toggle events (for backward compatibility during transition)
  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent<boolean>) => {
      setSidebarCollapsed(event.detail);
    };

    window.addEventListener('seerSidebarToggle', handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener('seerSidebarToggle', handleSidebarToggle as EventListener);
    };
  }, []);

  const handleSidebarCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('seerSidebarCollapsed', JSON.stringify(collapsed));
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <SeerSidebar 
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleSidebarCollapseChange}
        forceCollapsed={isWorkflowsPage && sidebarCollapsed}
      />
      <main className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'ml-[56px]' : 'ml-[220px]'}`}>{children}</main>
      <OnboardingTour />
    </div>
  );
}

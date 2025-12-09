import { SeerSidebar } from "@/components/seer/SeerSidebar";
import { OnboardingTour } from "@/components/OnboardingTour";

interface SeerLayoutProps {
  children: React.ReactNode;
}

export function SeerLayout({ children }: SeerLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <SeerSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <OnboardingTour />
    </div>
  );
}

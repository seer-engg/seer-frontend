import { SeerSidebar } from "@/components/seer/SeerSidebar";

interface SeerLayoutProps {
  children: React.ReactNode;
}

export function SeerLayout({ children }: SeerLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <SeerSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}

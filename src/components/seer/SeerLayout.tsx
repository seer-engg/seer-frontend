import { OnboardingTour } from "@/components/general/OnboardingTour";

export function SeerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">{children}</main>
      <OnboardingTour />
    </div>
  );
}

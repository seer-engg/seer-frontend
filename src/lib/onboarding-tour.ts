export function restartOnboardingTour(): void {
  if (typeof window !== "undefined") {
    window.restartOnboardingTour?.();
  }
}

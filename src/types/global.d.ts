export {};

declare global {
  interface Window {
    restartOnboardingTour?: () => void;
  }
}

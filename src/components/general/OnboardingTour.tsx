import { useState, useEffect, useCallback } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS, Step, CallBackProps } from "react-joyride";
import { useUser } from "@clerk/clerk-react";

const STORAGE_KEY_PREFIX = "seer:onboarding:completed:";

const getTourContent = (title: string, text: string) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const getTourSteps = (): Step[] => [
  {
    target: "body",
    content: getTourContent("Welcome to Seer! 👋", "Seer helps you build and automate AI workflows. Let's take a quick tour to get you started."),
    placement: "center",
    disableBeacon: true,
    disableOverlayClose: false,
  },
  {
    target: "main",
    content: getTourContent("Workflow Canvas ⚡", "Build powerful AI workflows here. Connect LLM blocks, tools, and integrations to create automated processes. Drag and drop blocks to design your workflow visually."),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-floating-actions]',
    content: getTourContent("Quick Actions 🎯", "Access Settings and switch themes from these floating buttons on the workflow canvas. Configure your OAuth connections, manage your profile, and customize your experience."),
    placement: "left",
    disableBeacon: true,
  },
  {
    target: "body",
    content: getTourContent("You're All Set! 🎉", "You can restart this tour anytime from Settings. Ready to start building? Create your first workflow and connect it to your favorite tools!"),
    placement: "center",
    disableBeacon: true,
  },
];

const getUserStorageKey = (user: { primaryEmailAddress?: { emailAddress?: string } | null; emailAddresses?: Array<{ emailAddress?: string }> }): string => {
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "unknown";
  return `${STORAGE_KEY_PREFIX}${email}`;
};

interface OnboardingTourProps {
  onRestart?: () => void;
}

export function OnboardingTour({ onRestart }: OnboardingTourProps) {
  const { user, isLoaded } = useUser();
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const storageKey = getUserStorageKey(user);
    if (localStorage.getItem(storageKey) === "true") {
      setLoading(false);
      return;
    }

    setRun(true);
    setLoading(false);
  }, [isLoaded, user]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const handleTourCallback = async (data: CallBackProps) => {
    const { status, type, action } = data;

    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn("Tour target not found, skipping step");
      return;
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      localStorage.setItem(getUserStorageKey(user), "true");
    }

    if (action === ACTIONS.START && onRestart) {
      onRestart();
    }
  };

  const restartTour = useCallback(() => {
    localStorage.removeItem(getUserStorageKey(user));
    setRun(true);
  }, [user]);

  useEffect(() => {
    window.restartOnboardingTour = restartTour;
    return () => { delete window.restartOnboardingTour; };
  }, [restartTour]);

  if (loading || !isLoaded || !user) return null;

  const tourStyles = {
    options: {
      primaryColor: "hsl(239, 84%, 67%)",
      zIndex: 10000,
      arrowColor: "hsl(var(--card))",
      backgroundColor: "hsl(var(--card))",
      overlayColor: "rgba(0, 0, 0, 0.5)",
      textColor: "hsl(var(--foreground))",
      width: 380,
    },
    tooltip: { borderRadius: "var(--radius)", padding: "1.5rem" },
    tooltipContainer: { textAlign: "left" as const },
    tooltipTitle: { fontSize: "1.125rem", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "0.5rem" },
    tooltipContent: { fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", padding: 0 },
    buttonNext: {
      backgroundColor: "hsl(239, 84%, 67%)",
      color: "hsl(var(--seer-foreground))",
      fontSize: "0.875rem",
      fontWeight: 500,
      padding: "0.5rem 1rem",
      borderRadius: "var(--radius)",
      border: "none",
      outline: "none",
    },
    buttonBack: { color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", marginRight: "auto" },
    buttonSkip: { color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" },
    beacon: { inner: { backgroundColor: "hsl(239, 84%, 67%)" }, outer: { borderColor: "hsl(239, 84%, 67%)" } },
    spotlight: { borderRadius: "var(--radius)" },
  };

  return (
    <Joyride
      steps={getTourSteps()}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleTourCallback}
      scrollToFirstStep
      disableOverlayClose={false}
      styles={tourStyles}
    />
  );
}



import { useState, useEffect, useCallback } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS, Step, CallBackProps } from "react-joyride";
import { useUser } from "@clerk/clerk-react";

const STORAGE_KEY_PREFIX = "seer:onboarding:completed:";

// Tour steps configuration
const getTourSteps = (): Step[] => [
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Seer! 👋</h3>
        <p className="text-sm text-muted-foreground">
          Seer helps you build and automate AI workflows. Let's take a quick tour to get you started.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
    disableOverlayClose: false,
  },
  {
    target: "main",
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Workflow Canvas ⚡</h3>
        <p className="text-sm text-muted-foreground">
          Build powerful AI workflows here. Connect LLM blocks, tools, and integrations to create automated processes. Drag and drop blocks to design your workflow visually.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-floating-actions]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Quick Actions 🎯</h3>
        <p className="text-sm text-muted-foreground">
          Access Settings and switch themes from these floating buttons on the workflow canvas. Configure your OAuth connections, manage your profile, and customize your experience.
        </p>
      </div>
    ),
    placement: "left",
    disableBeacon: true,
  },
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">You're All Set! 🎉</h3>
        <p className="text-sm text-muted-foreground">
          You can restart this tour anytime from Settings. Ready to start building? Create your first workflow and connect it to your favorite tools!
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
];

interface OnboardingTourProps {
  onRestart?: () => void;
}

export function OnboardingTour({ onRestart }: OnboardingTourProps) {
  const { user, isLoaded } = useUser();
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has completed onboarding
  const checkOnboardingStatus = useCallback(async () => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress ??
      "unknown";
    const storageKey = `${STORAGE_KEY_PREFIX}${userEmail}`;

    // Check localStorage (fast)
    const localCompleted = localStorage.getItem(storageKey);
    if (localCompleted === "true") {
      setLoading(false);
      return;
    }

    // First-time user - start tour
    setRun(true);
    setLoading(false);
  }, [isLoaded, user]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  // Handle tour completion
  const handleTourCallback = async (data: CallBackProps) => {
    const { status, type, action } = data;

    // Handle missing targets gracefully
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn("Tour target not found, skipping step");
      return;
    }

    // Tour completed or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);

      // Mark as completed
      const userEmail =
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress ??
        "unknown";
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userEmail}`, "true");
    }

    // Handle tour restart
    if (action === ACTIONS.START && onRestart) {
      onRestart();
    }
  };

  // Expose restart function globally for Settings page
  const restartTour = useCallback(() => {
    // Clear flags
    const userEmail =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "unknown";
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userEmail}`);
    setRun(true);
  }, [user]);

  // Expose restart function globally for Settings page
  useEffect(() => {
    window.restartOnboardingTour = restartTour;
    return () => {
      delete window.restartOnboardingTour;
    };
  }, [restartTour]);

  if (loading || !isLoaded || !user) {
    return null;
  }

  return (
    <Joyride
      steps={getTourSteps()}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleTourCallback}
      scrollToFirstStep={true}
      disableOverlayClose={false}
      styles={{
        options: {
          primaryColor: "hsl(239, 84%, 67%)", // Seer brand color
          zIndex: 10000,
          arrowColor: "hsl(var(--card))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          textColor: "hsl(var(--foreground))",
          width: 380,
        },
        tooltip: {
          borderRadius: "var(--radius)",
          padding: "1.5rem",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "1.125rem",
          fontWeight: 600,
          color: "hsl(var(--foreground))",
          marginBottom: "0.5rem",
        },
        tooltipContent: {
          fontSize: "0.875rem",
          color: "hsl(var(--muted-foreground))",
          padding: 0,
        },
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
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.875rem",
          marginRight: "auto",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.875rem",
        },
        beacon: {
          inner: {
            backgroundColor: "hsl(239, 84%, 67%)",
          },
          outer: {
            borderColor: "hsl(239, 84%, 67%)",
          },
        },
        spotlight: {
          borderRadius: "var(--radius)",
        },
      }}
    />
  );
}



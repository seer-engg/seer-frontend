import { useState, useEffect, useCallback } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS, Step, CallBackProps } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "seer_onboarding_completed";

// Tour steps configuration
const getTourSteps = (): Step[] => [
  {
    target: "body",
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to Seer! 👋</h3>
        <p className="text-sm text-muted-foreground">
          Seer helps you evaluate and improve AI agents. Let's take a quick tour to get you started.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
    disableOverlayClose: false,
  },
  {
    target: "aside",
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Main Navigation</h3>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to navigate between Orchestrator, Evals, Traces, and Tool Hub. Click the collapse button to save space.
        </p>
      </div>
    ),
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="evals-page"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Generate Agent Specs</h3>
        <p className="text-sm text-muted-foreground">
          Describe your agent idea here, and Seer will generate a detailed spec with test cases. This is where the magic happens!
        </p>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: '[data-tour="settings-page"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Configure Settings</h3>
        <p className="text-sm text-muted-foreground">
          Add your API keys, manage preferences, and customize your experience. Don't forget to set up your OpenAI API key for unlimited queries!
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
          You can restart this tour anytime from Settings. Ready to start evaluating agents?
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
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has completed onboarding
  const checkOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check localStorage first (fast)
    const localCompleted = localStorage.getItem(STORAGE_KEY);
    if (localCompleted === "true") {
      setLoading(false);
      return;
    }

    // Check Supabase profile
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("has_completed_onboarding")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is fine for new users
        console.error("Error checking onboarding status:", error);
      }

      if (data?.has_completed_onboarding) {
        localStorage.setItem(STORAGE_KEY, "true");
        setLoading(false);
        return;
      }

      // First-time user - start tour
      setRun(true);
      setLoading(false);
    } catch (error) {
      console.error("Error checking onboarding:", error);
      // Fallback: if Supabase fails, check localStorage only
      setLoading(false);
    }
  }, [user]);

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
      localStorage.setItem(STORAGE_KEY, "true");

      // Update Supabase profile
      if (user) {
        try {
          await supabase
            .from("profiles")
            .update({ has_completed_onboarding: true })
            .eq("id", user.id);
        } catch (error) {
          console.error("Error updating onboarding status:", error);
          // Continue anyway - localStorage is set
        }
      }
    }

    // Handle tour restart
    if (action === ACTIONS.START && onRestart) {
      onRestart();
    }
  };

  // Expose restart function globally for Settings page
  const restartTour = useCallback(() => {
    // Clear flags
    localStorage.removeItem(STORAGE_KEY);
    
    if (user) {
      // Clear Supabase flag
      supabase
        .from("profiles")
        .update({ has_completed_onboarding: false })
        .eq("id", user.id)
        .then(() => {
          setRun(true);
        })
        .catch((error) => {
          console.error("Error clearing onboarding status:", error);
          // Still start tour even if Supabase update fails
          setRun(true);
        });
    } else {
      setRun(true);
    }
  }, [user]);

  // Expose restart function globally for Settings page
  useEffect(() => {
    (window as any).restartOnboardingTour = restartTour;
    return () => {
      delete (window as any).restartOnboardingTour;
    };
  }, [restartTour]);

  if (loading || !user) {
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

// Export restart function for use in Settings page
export const restartOnboardingTour = () => {
  if ((window as any).restartOnboardingTour) {
    (window as any).restartOnboardingTour();
  }
};


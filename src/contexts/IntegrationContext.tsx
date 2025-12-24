import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { IntegrationType } from "@/lib/integrations/client";

export type IntegrationSelection = {
  id: string; // OAuthConnection.id (required for tool execution)
  name: string; // Resource name (workspace/repo/folder name)
  type?: string;
  mode?: "connected" | "sandbox"; // Track whether using connected account or sandbox
  // Resource-specific IDs (optional, for Asana workspace, GitHub repo, etc.)
  workspaceGid?: string; // Asana workspace GID
  projectGid?: string; // Asana project GID
  repoId?: string; // GitHub repo ID
  folderId?: string; // Google Drive folder ID
};

export type IntegrationState = Record<
  IntegrationType,
  IntegrationSelection | null
>;

interface IntegrationContextValue {
  selection: IntegrationState;
  setSelection: React.Dispatch<React.SetStateAction<IntegrationState>>;
  updateSelection: (
    type: IntegrationType,
    value: IntegrationSelection | null,
  ) => void;
}

const STORAGE_KEY = "seer_integrations_state";

const defaultState = {
  github: null,
  googledrive: null,
  asana: null,
  gmail: null,
} satisfies IntegrationState;

const IntegrationContext = createContext<IntegrationContextValue | undefined>(
  undefined,
);

export function IntegrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selection, setSelection] = useState<IntegrationState>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultState, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return defaultState;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // ignore persist failures
    }
  }, [selection]);

  const value = useMemo<IntegrationContextValue>(
    () => ({
      selection,
      setSelection,
      updateSelection: (type, value) => {
        console.log(`[IntegrationContext] updateSelection called for ${type}:`, JSON.stringify(value, null, 2));
        setSelection((prev) => {
          const updated = { ...prev, [type]: value };
          console.log(`[IntegrationContext] Selection updated. New state:`, JSON.stringify(updated, null, 2));
          return updated;
        });
      },
    }),
    [selection],
  );

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegrationContext() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) {
    throw new Error(
      "useIntegrationContext must be used within an IntegrationProvider",
    );
  }
  return ctx;
}


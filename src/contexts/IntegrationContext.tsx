import { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { IntegrationType } from "@/lib/composio/client";

export type IntegrationSelection = {
  id: string;
  name: string;
  type?: string;
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
  sandbox: null,
  github: null,
  googledrive: null,
  asana: null,
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
      updateSelection: (type, value) =>
        setSelection((prev) => ({ ...prev, [type]: value })),
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


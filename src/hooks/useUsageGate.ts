import { useMemo, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { getApiKey } from "@/lib/api-key";

const FREE_QUERY_LIMIT = 1000;
const QUERY_COUNT_KEY_PREFIX = "seer:usage:query_count:";

interface UsageGate {
  hasApiKey: boolean;
  queryCount: number;
  canQuery: boolean;
  isLoading: boolean;
  incrementQueryCount: () => Promise<void>;
  remainingFreeQueries: number;
}

export function useUsageGate(): UsageGate {
  const { user, isLoaded } = useUser();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const userEmail = useMemo(() => {
    return (
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null
    );
  }, [user]);

  const queryCountKey = useMemo(() => {
    if (!userEmail) return null;
    return `${QUERY_COUNT_KEY_PREFIX}${userEmail}`;
  }, [userEmail]);

  useEffect(() => {
    if (!isLoaded) return;

    // API key is stored locally by the chat UI (see `src/lib/api-key.tsx`)
    setHasApiKey(Boolean(getApiKey()));

    if (!queryCountKey) {
      setQueryCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const raw = window.localStorage.getItem(queryCountKey);
      const parsed = raw ? Number(raw) : 0;
      setQueryCount(Number.isFinite(parsed) ? parsed : 0);
    } catch {
      setQueryCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, queryCountKey]);

  const incrementQueryCount = async () => {
    if (!queryCountKey) return;

    setQueryCount((prev) => {
      const next = prev + 1;
      try {
        window.localStorage.setItem(queryCountKey, String(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  const canQuery = hasApiKey || queryCount < FREE_QUERY_LIMIT;
  const remainingFreeQueries = Math.max(0, FREE_QUERY_LIMIT - queryCount);

  return {
    hasApiKey,
    queryCount,
    canQuery,
    isLoading: !isLoaded || isLoading,
    incrementQueryCount,
    remainingFreeQueries,
  };
}

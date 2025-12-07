import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_QUERY_LIMIT = 3;

interface UsageGate {
  hasApiKey: boolean;
  queryCount: number;
  canQuery: boolean;
  isLoading: boolean;
  incrementQueryCount: () => Promise<void>;
  remainingFreeQueries: number;
}

export function useUsageGate(): UsageGate {
  const { user } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("openai_api_key, query_count")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        setHasApiKey(!!data.openai_api_key);
        setQueryCount(data.query_count || 0);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const incrementQueryCount = async () => {
    if (!user) return;

    const newCount = queryCount + 1;
    setQueryCount(newCount);

    await supabase
      .from("profiles")
      .update({ query_count: newCount })
      .eq("id", user.id);
  };

  const canQuery = hasApiKey || queryCount < FREE_QUERY_LIMIT;
  const remainingFreeQueries = Math.max(0, FREE_QUERY_LIMIT - queryCount);

  return {
    hasApiKey,
    queryCount,
    canQuery,
    isLoading,
    incrementQueryCount,
    remainingFreeQueries,
  };
}

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import {
  getBootstrapData,
  getToolsConnectionStatus,
  listConnectedAccounts,
  type BootstrapData,
  type ToolConnectionStatus,
  type ConnectedAccount,
} from "@/lib/api-client";

/**
 * Feature flag for bootstrap endpoint usage.
 * Set to "true" to use consolidated bootstrap endpoint (2-3s load time).
 * Set to "false" to fall back to individual API calls (16s load time).
 */
const USE_BOOTSTRAP = import.meta.env.VITE_USE_BOOTSTRAP === "true";

export interface BootstrapResult {
  tools: unknown[];
  models: unknown[];
  toolsStatus: ToolConnectionStatus[];
  connections: ConnectedAccount[];
  nodeTypes: Record<string, unknown>;
  workflows: {
    items: unknown[];
    next_cursor: string | null;
  };
  isLoading: boolean;
  error: Error | null;
  cached: boolean;
}

/**
 * Hook for fetching bootstrap data with automatic fallback.
 *
 * - If VITE_USE_BOOTSTRAP=true: Uses consolidated /api/bootstrap endpoint (2-3s)
 * - If VITE_USE_BOOTSTRAP=false or bootstrap fails: Falls back to individual calls (16s)
 *
 * The consolidated endpoint fetches all data in parallel on the backend,
 * reducing load time from 16 seconds to 2-3 seconds.
 */
// eslint-disable-next-line complexity
export function useBootstrap(): BootstrapResult {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const isAuthenticated = isLoaded && !!user;

  // Try consolidated bootstrap endpoint first (if feature flag enabled)
  const {
    data: bootstrapData,
    isLoading: bootstrapLoading,
    error: bootstrapError,
  } = useQuery({
    queryKey: ["bootstrap", userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      try {
        const data = await getBootstrapData();
        return data;
      } catch (error) {
        console.error("Bootstrap endpoint failed, will fall back to individual calls:", error);
        throw error;
      }
    },
    enabled: USE_BOOTSTRAP && isAuthenticated,
    retry: false, // Don't retry bootstrap - fall back to individual calls instead
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fallback: Individual API calls (used when bootstrap is disabled or fails)
  const shouldUseFallback = !USE_BOOTSTRAP || (USE_BOOTSTRAP && bootstrapError);

  const {
    data: toolsStatusData,
    isLoading: toolsStatusLoading,
    error: toolsStatusError,
  } = useQuery({
    queryKey: ["tools-status", userEmail],
    queryFn: async () => {
      if (!userEmail) return { tools: [] };
      return getToolsConnectionStatus();
    },
    enabled: shouldUseFallback && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
  } = useQuery({
    queryKey: ["connections", userEmail],
    queryFn: async () => {
      if (!userEmail) return { items: [] };
      return listConnectedAccounts({ userIds: [userEmail] });
    },
    enabled: shouldUseFallback && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Determine which data source to use
  const isUsingBootstrap = USE_BOOTSTRAP && bootstrapData && !bootstrapError;
  const isLoading = bootstrapLoading || (shouldUseFallback && (toolsStatusLoading || connectionsLoading));
  const error = bootstrapError || toolsStatusError || connectionsError || null;

  if (isUsingBootstrap && bootstrapData) {
    // Using consolidated bootstrap data
    return {
      tools: bootstrapData.tools,
      models: bootstrapData.models,
      toolsStatus: bootstrapData.tools_status,
      connections: bootstrapData.connections,
      nodeTypes: bootstrapData.node_types,
      workflows: bootstrapData.workflows,
      isLoading: false,
      error: null,
      cached: bootstrapData.cached,
    };
  }

  // Using fallback individual calls
  return {
    tools: [], // Would need to add individual call for tools if needed
    models: [], // Would need to add individual call for models if needed
    toolsStatus: toolsStatusData?.tools || [],
    connections: connectionsData?.items || [],
    nodeTypes: {}, // Would need to add individual call for node types if needed
    workflows: { items: [], next_cursor: null }, // Would need to add individual call for workflows if needed
    isLoading,
    error: error as Error | null,
    cached: false,
  };
}

import { useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useShallow } from 'zustand/shallow';

import {
  useToolsStore,
  type ToolIntegrationStatus,
  type ToolMetadata,
} from '@/stores/toolsStore';

export type { ToolMetadata, ToolIntegrationStatus };

// eslint-disable-next-line complexity
export function useIntegrationTools() {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const isAuthenticated = isLoaded && !!user;

  const {
    tools,
    toolsWithStatus,
    connectedIntegrations,
    toolsLoading,
    toolStatusLoading,
    connectionsLoading,
    toolsError,
    toolsLoaded,
    toolStatusLoaded,
    connectionsLoaded,
    setUserContext,
    loadIntegrationTools,
    loadToolStatus,
    loadConnections,
    refreshIntegrationTools,
    getToolIntegrationStatus,
    isIntegrationConnected,
    getConnectionId,
    connectIntegration,
  } = useToolsStore(
    useShallow((state) => ({
      tools: state.tools,
      toolsWithStatus: state.toolsWithStatus,
      connectedIntegrations: state.connectedIntegrations,
      toolsLoading: state.toolsLoading,
      toolStatusLoading: state.toolStatusLoading,
      connectionsLoading: state.connectionsLoading,
      toolsError: state.toolsError,
      toolsLoaded: state.toolsLoaded,
      toolStatusLoaded: state.toolStatusLoaded,
      connectionsLoaded: state.connectionsLoaded,
      setUserContext: state.setUserContext,
      loadIntegrationTools: state.loadIntegrationTools,
      loadToolStatus: state.loadToolStatus,
      loadConnections: state.loadConnections,
      refreshIntegrationTools: state.refreshIntegrationTools,
      getToolIntegrationStatus: state.getToolIntegrationStatus,
      isIntegrationConnected: state.isIntegrationConnected,
      getConnectionId: state.getConnectionId,
      connectIntegration: state.connectIntegration,
    })),
  );

  useEffect(() => {
    setUserContext({ email: userEmail, isAuthenticated });
  }, [setUserContext, userEmail, isAuthenticated]);

  // Initial data load - try bootstrap first, fall back to individual calls
  useEffect(() => {
    if (!isAuthenticated) return;

    const needsLoad = !toolsLoaded && !toolsLoading &&
                      !toolStatusLoaded && !toolStatusLoading &&
                      !connectionsLoaded && !connectionsLoading;

    if (needsLoad) {
      // Use refreshIntegrationTools which tries bootstrap first
      void refreshIntegrationTools().catch(() => undefined);
    }
  }, [
    isAuthenticated,
    toolsLoaded, toolsLoading,
    toolStatusLoaded, toolStatusLoading,
    connectionsLoaded, connectionsLoading,
    refreshIntegrationTools
  ]);

  const isLoading = toolsLoading || toolStatusLoading || connectionsLoading || !isLoaded;

  return {
    tools,
    toolsWithStatus,
    connectedIntegrations,
    isLoading,
    toolsLoading,
    connectionsLoading,
    error: toolsError,
    userEmail,
    isAuthenticated,
    getToolIntegrationStatus,
    isIntegrationConnected,
    getConnectionId,
    connectIntegration,
    refresh: refreshIntegrationTools,
  };
}

export function useToolIntegration(toolName: string) {
  const { isLoading, getToolIntegrationStatus, connectIntegration, refresh, userEmail } =
    useIntegrationTools();

  const status = useMemo(() => getToolIntegrationStatus(toolName), [getToolIntegrationStatus, toolName]);

  const initiateAuth = useCallback(async () => {
    if (!status?.integrationType) {
      return null;
    }
    return connectIntegration(status.integrationType, { toolNames: [status.tool.name] });
  }, [status, connectIntegration]);

  return { status, isLoading, userEmail, initiateAuth, refresh };
}

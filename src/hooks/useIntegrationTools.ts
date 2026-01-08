import { useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useShallow } from 'zustand/shallow';

import {
  useIntegrationStore,
  type ToolIntegrationStatus,
  type ToolMetadata,
} from '@/stores/integrationStore';

export type { ToolMetadata, ToolIntegrationStatus };

function useConditionalLoader(
  shouldLoad: boolean,
  loader: () => Promise<unknown>,
  deps: unknown[],
) {
  useEffect(() => {
    if (!shouldLoad) {
      return;
    }
    void loader().catch(() => undefined);
  }, [shouldLoad, ...deps]);
}

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
  } = useIntegrationStore(
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

  useConditionalLoader(
    isAuthenticated && !toolsLoaded && !toolsLoading,
    loadIntegrationTools,
    [loadIntegrationTools],
  );
  useConditionalLoader(
    isAuthenticated && !toolStatusLoaded && !toolStatusLoading,
    loadToolStatus,
    [loadToolStatus],
  );
  useConditionalLoader(
    isAuthenticated && !connectionsLoaded && !connectionsLoading,
    loadConnections,
    [loadConnections],
  );

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

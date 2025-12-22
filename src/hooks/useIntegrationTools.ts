/**
 * Integration Tools Hook
 * 
 * Manages integration tools, their OAuth requirements, and authorization status.
 * Used by workflow canvas to show connection status for tool blocks.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApiClient } from '@/lib/api-client';
import { listConnectedAccounts, initiateConnection, ConnectedAccount } from '@/lib/tools/proxy-client';
import { IntegrationType, formatScopes, getRequiredScopes } from '@/lib/integrations/client';
import { useDefaultUser } from './useDefaultUser';

/**
 * Tool metadata from backend
 */
export interface ToolMetadata {
  name: string;
  description: string;
  required_scopes: string[];
  integration_type?: string | null;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Integration status for a tool
 */
export interface ToolIntegrationStatus {
  tool: ToolMetadata;
  integrationType: IntegrationType | null;
  isConnected: boolean;
  connectionId: string | null;
  requiredScopes: string[];
}

/**
 * Map tool scopes to integration type
 */
function getIntegrationTypeFromScopes(scopes: string[]): IntegrationType | null {
  if (!scopes.length) return null;
  
  for (const scope of scopes) {
    const scopeLower = scope.toLowerCase();
    if (scopeLower.includes('gmail')) return 'gmail';
    if (scopeLower.includes('drive')) return 'googledrive';
    if (scopeLower.includes('github')) return 'github';
    if (scopeLower.includes('asana')) return 'asana';
  }
  return null;
}

/**
 * Map tool name to integration type
 */
function getIntegrationTypeFromToolName(toolName: string): IntegrationType | null {
  const nameLower = toolName.toLowerCase();
  if (nameLower.includes('gmail')) return 'gmail';
  if (nameLower.includes('drive') || nameLower.includes('google_drive')) return 'googledrive';
  if (nameLower.includes('github')) return 'github';
  if (nameLower.includes('asana')) return 'asana';
  return null;
}

/**
 * Hook for managing integration tools and their authorization status
 */
export function useIntegrationTools() {
  const { email: userEmail, isLoaded, isAuthenticated } = useDefaultUser();
  const queryClient = useQueryClient();

  // Fetch available tools from backend
  const { 
    data: toolsData, 
    isLoading: toolsLoading,
    error: toolsError,
    refetch: refetchTools
  } = useQuery({
    queryKey: ['integration-tools'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools;
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's connected accounts
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    refetch: refetchConnections
  } = useQuery({
    queryKey: ['user-connections', userEmail],
    queryFn: async () => {
      const response = await listConnectedAccounts({ userIds: [userEmail] });
      return response.items || [];
    },
    enabled: isLoaded,
    staleTime: 30 * 1000, // 30 seconds
  });

  const tools = toolsData || [];
  const connections = connectionsData || [];

  /**
   * Get all connected integration types
   */
  const connectedIntegrations = useMemo(() => {
    const connected = new Map<IntegrationType, ConnectedAccount>();
    
    for (const conn of connections) {
      if (conn.status === 'ACTIVE') {
        const slug = conn.toolkit?.slug as IntegrationType;
        if (slug) {
          connected.set(slug, conn);
        }
      }
    }
    
    return connected;
  }, [connections]);

  /**
   * Get integration type for a tool - checks backend field first, then fallback heuristics
   */
  const getToolIntegrationType = useCallback((tool: ToolMetadata): IntegrationType | null => {
    // First check if backend provided integration_type
    if (tool.integration_type) {
      return tool.integration_type as IntegrationType;
    }
    // Fall back to heuristics based on scopes or tool name
    return getIntegrationTypeFromScopes(tool.required_scopes) ||
           getIntegrationTypeFromToolName(tool.name);
  }, []);

  /**
   * Get integration status for a specific tool
   */
  const getToolIntegrationStatus = useCallback((toolName: string): ToolIntegrationStatus | null => {
    const tool = tools.find(t => t.name === toolName);
    if (!tool) return null;

    // Determine integration type
    const integrationType = getToolIntegrationType(tool);

    // If no integration required, tool is always available
    if (!integrationType || tool.required_scopes.length === 0) {
      return {
        tool,
        integrationType: null,
        isConnected: true,
        connectionId: null,
        requiredScopes: [],
      };
    }

    // Check if integration is connected
    const connection = connectedIntegrations.get(integrationType);
    
    return {
      tool,
      integrationType,
      isConnected: !!connection,
      connectionId: connection?.id || null,
      requiredScopes: tool.required_scopes,
    };
  }, [tools, connectedIntegrations, getToolIntegrationType]);

  /**
   * Get all tools with their integration status
   */
  const toolsWithStatus = useMemo((): ToolIntegrationStatus[] => {
    return tools.map(tool => {
      const integrationType = getToolIntegrationType(tool);

      if (!integrationType || tool.required_scopes.length === 0) {
        return {
          tool,
          integrationType: null,
          isConnected: true,
          connectionId: null,
          requiredScopes: [],
        };
      }

      const connection = connectedIntegrations.get(integrationType);
      
      return {
        tool,
        integrationType,
        isConnected: !!connection,
        connectionId: connection?.id || null,
        requiredScopes: tool.required_scopes,
      };
    });
  }, [tools, connectedIntegrations, getToolIntegrationType]);

  /**
   * Check if a specific integration type is connected
   */
  const isIntegrationConnected = useCallback((type: IntegrationType): boolean => {
    return connectedIntegrations.has(type);
  }, [connectedIntegrations]);

  /**
   * Get connection ID for an integration type
   */
  const getConnectionId = useCallback((type: IntegrationType): string | null => {
    return connectedIntegrations.get(type)?.id || null;
  }, [connectedIntegrations]);

  /**
   * Initiate OAuth connection for an integration
   */
  const connectIntegration = useCallback(async (type: IntegrationType): Promise<string | null> => {
    // Get required scopes for this integration
    const scopes = getRequiredScopes(type);
    if (scopes.length === 0 && type !== 'sandbox') {
      console.error(`[useIntegrationTools] No scopes configured for ${type}`);
      return null;
    }

    const scopeString = formatScopes(scopes);
    const callbackUrl = `${window.location.origin}${window.location.pathname}`;

    const result = await initiateConnection({
      userId: userEmail,
      provider: type,
      scope: scopeString,
      callbackUrl,
    });

    return result.redirectUrl;
  }, [userEmail]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    refetchTools();
    refetchConnections();
  }, [refetchTools, refetchConnections]);

  return {
    // Data
    tools,
    toolsWithStatus,
    connectedIntegrations,
    
    // Loading states
    isLoading: toolsLoading || connectionsLoading || !isLoaded,
    toolsLoading,
    connectionsLoading,
    error: toolsError,
    
    // User info
    userEmail,
    isAuthenticated,
    
    // Methods
    getToolIntegrationStatus,
    isIntegrationConnected,
    getConnectionId,
    connectIntegration,
    refresh,
  };
}

/**
 * Hook for a specific tool's integration status
 */
export function useToolIntegration(toolName: string) {
  const { 
    getToolIntegrationStatus, 
    isLoading, 
    connectIntegration,
    userEmail,
    refresh
  } = useIntegrationTools();

  const status = useMemo(() => {
    return getToolIntegrationStatus(toolName);
  }, [getToolIntegrationStatus, toolName]);

  const initiateAuth = useCallback(async () => {
    if (!status?.integrationType) return null;
    return connectIntegration(status.integrationType);
  }, [status, connectIntegration]);

  return {
    status,
    isLoading,
    userEmail,
    initiateAuth,
    refresh,
  };
}


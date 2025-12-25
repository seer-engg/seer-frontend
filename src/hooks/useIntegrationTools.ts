/**
 * Integration Tools Hook
 * 
 * Manages integration tools, their OAuth requirements, and authorization status.
 * Used by workflow canvas to show connection status for tool blocks.
 * 
 * Key concepts:
 * - OAuth providers (google, github) can have multiple integration types
 * - For example, 'google' OAuth provider supports: gmail, google_sheets, google_drive
 * - Connection status is determined by checking if the OAuth provider has the required scopes
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backendApiClient, listConnectedAccounts, initiateConnection, ConnectedAccount, getToolsConnectionStatus, ToolConnectionStatus } from '@/lib/api-client';
import { IntegrationType, formatScopes, getOAuthProvider } from '@/lib/integrations/client';
import { useUser } from '@clerk/clerk-react';

/**
 * Tool metadata from backend
 */
export interface ToolMetadata {
  name: string;
  description: string;
  required_scopes: string[];
  integration_type?: string | null;
  provider?: string | null;  // OAuth provider (e.g., 'google', 'github')
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
    if (scopeLower.includes('spreadsheets') || scopeLower.includes('sheets')) return 'google_sheets';
    if (scopeLower.includes('drive')) return 'google_drive';
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
  if (nameLower.includes('sheets') || nameLower.includes('spreadsheet')) return 'google_sheets';
  if (nameLower.includes('drive') || nameLower.includes('google_drive')) return 'google_drive';
  if (nameLower.includes('github')) return 'github';
  if (nameLower.includes('asana')) return 'asana';
  return null;
}

/**
 * Hook for managing integration tools and their authorization status
 */
export function useIntegrationTools() {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
    
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? 
                   user?.emailAddresses?.[0]?.emailAddress ?? 
                   null;


  // Fetch available tools from backend
  const { 
    data: toolsData, 
    isLoading: toolsLoading,
    error: toolsError,
    refetch: refetchTools
  } = useQuery({
    queryKey: ['integration-tools'],
    queryFn: async () => {
      if (!userEmail) return [];
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools;
    },
    enabled: isLoaded && !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch tool connection status from backend
  // This endpoint checks if OAuth provider has required scopes for each tool
  const {
    data: toolStatusData,
    isLoading: toolStatusLoading,
    refetch: refetchToolStatus
  } = useQuery({
    queryKey: ['tools-connection-status', userEmail],
    queryFn: async () => {
      try {
        const response = await getToolsConnectionStatus();
        return response.tools || [];
      } catch (error) {
        console.warn('[useIntegrationTools] Failed to fetch tool status, falling back to connections API', error);
        return null; // Will use fallback logic
      }
    },
    enabled: isLoaded && !!userEmail,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fallback: Fetch user's connected accounts (for backward compatibility)
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
    enabled: isLoaded && !!userEmail,
    staleTime: 30 * 1000, // 30 seconds
  });

  const tools = toolsData || [];
  const toolStatusMap = useMemo(() => {
    if (!toolStatusData) return null;
    const map = new Map<string, ToolConnectionStatus>();
    for (const status of toolStatusData) {
      map.set(status.tool_name, status);
    }
    return map;
  }, [toolStatusData]);
  const connections = connectionsData || [];

  /**
   * Build a map of OAuth provider -> connection with scopes
   * This is used for the fallback logic when tools/status API is not available
   */
  const providerConnectionsMap = useMemo(() => {
    const map = new Map<string, { scopes: Set<string>; connectionId: string }>();
    
    for (const conn of connections) {
      if (conn.status === 'ACTIVE') {
        const provider = conn.provider || conn.toolkit?.slug;
        if (provider) {
          const scopes = new Set((conn.scopes || '').split(' ').filter(Boolean));
          map.set(provider, {
            scopes,
            connectionId: conn.id
          });
        }
      }
    }
    
    return map;
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
   * Build helper maps from backend tool metadata
   */
  const integrationProviderMap = useMemo(() => {
    const map = new Map<IntegrationType, string>();
    for (const tool of tools) {
      const integrationType = getToolIntegrationType(tool);
      if (integrationType && tool.provider) {
        map.set(integrationType, tool.provider);
      }
    }
    return map;
  }, [tools, getToolIntegrationType]);

  const integrationScopesMap = useMemo(() => {
    const map = new Map<IntegrationType, Set<string>>();
    for (const tool of tools) {
      const integrationType = getToolIntegrationType(tool);
      if (!integrationType) continue;
      if (!map.has(integrationType)) {
        map.set(integrationType, new Set());
      }
      const scopeSet = map.get(integrationType)!;
      for (const scope of tool.required_scopes || []) {
        scopeSet.add(scope);
      }
    }
    return map;
  }, [tools, getToolIntegrationType]);

  const getIntegrationProviderForType = useCallback((integrationType: IntegrationType): string | null => {
    return integrationProviderMap.get(integrationType) || getOAuthProvider(integrationType);
  }, [integrationProviderMap]);

  const getIntegrationScopesForType = useCallback((integrationType: IntegrationType): string[] => {
    const backendScopes = integrationScopesMap.get(integrationType);
    return backendScopes ? Array.from(backendScopes) : [];
  }, [integrationScopesMap]);

  /**
   * Get all connected integration types
   * Now properly checks scopes instead of just provider match
   */
  const connectedIntegrations = useMemo(() => {
    const connected = new Map<IntegrationType, ConnectedAccount>();
    
    // If we have tool status data, use it to determine connected integrations
    if (toolStatusMap) {
      for (const tool of tools) {
        const status = toolStatusMap.get(tool.name);
        // Check if fully connected (has scopes AND refresh_token)
        if (status?.connected && status?.has_required_scopes && (status?.has_refresh_token !== false)) {
          const integrationType = getToolIntegrationType(tool) || (status.integration_type as IntegrationType | undefined);
          if (integrationType && !connected.has(integrationType)) {
            // Create a synthetic connection object for backward compatibility
            connected.set(integrationType, {
              id: status.connection_id || '',
              status: 'ACTIVE',
              toolkit: { slug: status.provider || integrationType }
            });
          }
        }
      }
      return connected;
    }
    
    // Fallback: Check scopes manually for each integration type
    const integrationTypes = Array.from(integrationScopesMap.keys());
    
    for (const integrationType of integrationTypes) {
      const oauthProvider = getIntegrationProviderForType(integrationType);
      if (!oauthProvider) continue;
      
      const providerConn = providerConnectionsMap.get(oauthProvider);
      if (!providerConn) continue;
      
      // Check if provider has required scopes for this integration type
      const requiredScopes = getIntegrationScopesForType(integrationType);
      if (!requiredScopes.length) continue;
      const hasAllScopes = requiredScopes.every(scope => providerConn.scopes.has(scope));
      
      if (hasAllScopes) {
        connected.set(integrationType, {
          id: providerConn.connectionId,
          status: 'ACTIVE',
          toolkit: { slug: oauthProvider }
        });
      }
    }
    
    return connected;
  }, [tools, toolStatusMap, providerConnectionsMap, getToolIntegrationType, getIntegrationProviderForType, getIntegrationScopesForType, integrationScopesMap]);

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

    // First check if we have status from the tools/status API
    if (toolStatusMap) {
      const status = toolStatusMap.get(toolName);
      if (status) {
        return {
          tool,
          integrationType,
          isConnected: status.connected && status.has_required_scopes,
          connectionId: status.connection_id,
          requiredScopes: tool.required_scopes,
        };
      }
    }

    // Fallback: Check using OAuth provider and scopes
    const oauthProvider = getIntegrationProviderForType(integrationType);
    if (oauthProvider) {
      const providerConn = providerConnectionsMap.get(oauthProvider);
      if (providerConn) {
        const hasAllScopes = tool.required_scopes.every(scope => providerConn.scopes.has(scope));
        return {
          tool,
          integrationType,
          isConnected: hasAllScopes,
          connectionId: hasAllScopes ? providerConn.connectionId : null,
          requiredScopes: tool.required_scopes,
        };
      }
    }

    // No connection found
    return {
      tool,
      integrationType,
      isConnected: false,
      connectionId: null,
      requiredScopes: tool.required_scopes,
    };
  }, [tools, toolStatusMap, providerConnectionsMap, getToolIntegrationType, getIntegrationProviderForType]);

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

      // Use toolStatusMap if available
      if (toolStatusMap) {
        const status = toolStatusMap.get(tool.name);
        if (status) {
          // Connection is fully functional only if it has scopes AND refresh_token
          const fullyConnected = status.connected && status.has_required_scopes && (status.has_refresh_token !== false);
          return {
            tool,
            integrationType,
            isConnected: fullyConnected,
            connectionId: status.connection_id,
            requiredScopes: tool.required_scopes,
          };
        }
      }

      // Fallback: check using OAuth provider and scopes
      const oauthProvider = getIntegrationProviderForType(integrationType);
      if (oauthProvider) {
        const providerConn = providerConnectionsMap.get(oauthProvider);
        if (providerConn) {
          const hasAllScopes = tool.required_scopes.every(scope => providerConn.scopes.has(scope));
          return {
            tool,
            integrationType,
            isConnected: hasAllScopes,
            connectionId: hasAllScopes ? providerConn.connectionId : null,
            requiredScopes: tool.required_scopes,
          };
        }
      }

      return {
        tool,
        integrationType,
        isConnected: false,
        connectionId: null,
        requiredScopes: tool.required_scopes,
      };
    });
  }, [tools, toolStatusMap, providerConnectionsMap, getToolIntegrationType, getIntegrationProviderForType]);

  /**
   * Check if a specific integration type is connected
   * Now properly checks if OAuth provider has required scopes
   */
  const isIntegrationConnected = useCallback((type: IntegrationType): boolean => {
    // First check connectedIntegrations (which now uses proper scope checking)
    if (connectedIntegrations.has(type)) {
      return true;
    }
    
    // Fallback: Check OAuth provider scopes directly
    const oauthProvider = getIntegrationProviderForType(type);
    if (!oauthProvider) return false;
    
    const providerConn = providerConnectionsMap.get(oauthProvider);
    if (!providerConn) return false;
    
    const requiredScopes = getIntegrationScopesForType(type);
    if (!requiredScopes.length) {
      return false;
    }
    return requiredScopes.every(scope => providerConn.scopes.has(scope));
  }, [connectedIntegrations, providerConnectionsMap, getIntegrationProviderForType, getIntegrationScopesForType]);

  /**
   * Get connection ID for an integration type
   */
  const getConnectionId = useCallback((type: IntegrationType): string | null => {
    const conn = connectedIntegrations.get(type);
    if (conn?.id) return conn.id;
    
    // Fallback: get from provider connections
    const oauthProvider = getIntegrationProviderForType(type);
    if (!oauthProvider) return null;
    
    const providerConn = providerConnectionsMap.get(oauthProvider);
    return providerConn?.connectionId || null;
  }, [connectedIntegrations, providerConnectionsMap, getIntegrationProviderForType]);

  /**
   * Initiate OAuth connection for an integration
   */
  const connectIntegration = useCallback(async (type: IntegrationType, options?: { toolName?: string }): Promise<string | null> => {
    if (!userEmail) { 
      console.error(`[useIntegrationTools] No user email found`);
      return null; 
    }
    // Prefer tool-specific scopes when available, otherwise fall back to integration-level scopes
    let scopes: string[] = [];
    if (options?.toolName) {
      const tool = tools.find(t => t.name === options.toolName);
      if (tool?.required_scopes?.length) {
        scopes = tool.required_scopes;
      }
    }
    if (scopes.length === 0) {
      scopes = getIntegrationScopesForType(type);
    }
    if (scopes.length === 0 && type !== 'sandbox') {
      console.error(`[useIntegrationTools] No scopes configured for ${type}`);
      return null;
    }

    // Get the OAuth provider for this integration type
    const provider = getIntegrationProviderForType(type);
    if (!provider && type !== 'sandbox') {
      console.error(`[useIntegrationTools] No OAuth provider configured for ${type}`);
      return null;
    }

    const scopeString = formatScopes(scopes);
    const callbackUrl = `${window.location.origin}${window.location.pathname}`;

    const result = await initiateConnection({
      userId: userEmail,
      provider: provider!, // Use OAuth provider (e.g., 'google' for gmail/drive/sheets)
      scope: scopeString,
      callbackUrl,
      integrationType: type, // Pass integration type so backend tracks which tool triggered this
    });

    return result.redirectUrl;
  }, [userEmail, tools, getIntegrationScopesForType, getIntegrationProviderForType]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    refetchTools();
    refetchToolStatus();
    refetchConnections();
  }, [refetchTools, refetchToolStatus, refetchConnections]);

  return {
    // Data
    tools,
    toolsWithStatus,
    connectedIntegrations,
    
    // Loading states
    isLoading: toolsLoading || toolStatusLoading || connectionsLoading || !isLoaded,
    toolsLoading,
    connectionsLoading,
    error: toolsError,
    
    // User info
    userEmail,
    isAuthenticated: isLoaded && !!user,
    
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
    return connectIntegration(status.integrationType, { toolName: status.tool.name });
  }, [status, connectIntegration]);

  return {
    status,
    isLoading,
    userEmail,
    initiateAuth,
    refresh,
  };
}


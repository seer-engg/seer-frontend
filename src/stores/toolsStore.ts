/* eslint-disable max-lines, max-lines-per-function */
import type { StateCreator } from 'zustand';

import type { FunctionBlockSchema } from '@/components/workflows/types';
import type {
  ConnectedAccount,
  ToolConnectionStatus,
} from '@/lib/api-client';
import {
  backendApiClient,
  getBootstrapData,
  getToolsConnectionStatus,
  initiateConnection,
  listConnectedAccounts,
} from '@/lib/api-client';
import type { JsonObject } from '@/types/workflow-spec';
import { IntegrationType, formatScopes, getOAuthProvider } from '@/lib/integrations/client';

import { createStore } from './createStore';

export interface ToolMetadata {
  name: string;
  description: string;
  required_scopes: string[];
  integration_type?: string | null;
  provider?: string | null;
  output_schema?: JsonObject | null;
  parameters: {
    type: string;
    properties: Record<string, JsonObject>;
    required: string[];
  };
}

export interface ToolIntegrationStatus {
  tool: ToolMetadata;
  integrationType: IntegrationType | null;
  isConnected: boolean;
  connectionId: string | null;
  requiredScopes: string[];
}

interface ProviderConnectionInfo {
  scopes: Set<string>;
  connectionId: string;
}

interface NodeFieldDescriptor {
  name: string;
  kind: string;
  required?: boolean;
}

interface NodeTypeDescriptor {
  type: string;
  title: string;
  fields: NodeFieldDescriptor[];
}

interface NodeTypeResponse {
  node_types: NodeTypeDescriptor[];
}

const NON_OAUTH_INTEGRATIONS = new Set<IntegrationType>(['sandbox']);

const INTEGRATION_SCOPE_DEFAULTS: Partial<Record<IntegrationType, string[]>> = {
  supabase: ['read:projects'],
};

const integrationNeedsConnection = (integrationType: IntegrationType | null): integrationType is IntegrationType => {
  return !!integrationType && !NON_OAUTH_INTEGRATIONS.has(integrationType);
};

const getIntegrationTypeFromScopes = (scopes: string[]): IntegrationType | null => {
  for (const scope of scopes) {
    const lower = scope.toLowerCase();
    if (lower.includes('gmail')) return 'gmail';
    if (lower.includes('spreadsheets') || lower.includes('sheets')) return 'google_sheets';
    if (lower.includes('drive')) return 'google_drive';
    if (lower.includes('github')) return 'github';
    if (lower.includes('asana')) return 'asana';
  }
  return null;
};

const getIntegrationTypeFromToolName = (toolName: string): IntegrationType | null => {
  const lower = toolName.toLowerCase();
  if (lower.includes('gmail')) return 'gmail';
  if (lower.includes('sheets') || lower.includes('spreadsheet')) return 'google_sheets';
  if (lower.includes('drive') || lower.includes('google_drive')) return 'google_drive';
  if (lower.includes('github')) return 'github';
  if (lower.includes('asana')) return 'asana';
  if (lower.includes('supabase')) return 'supabase';
  return null;
};

const getIntegrationType = (tool: ToolMetadata): IntegrationType | null => {
  if (tool.integration_type) {
    return tool.integration_type as IntegrationType;
  }
  return getIntegrationTypeFromScopes(tool.required_scopes) ?? getIntegrationTypeFromToolName(tool.name);
};

const buildProviderConnectionsMap = (connections: ConnectedAccount[]): Map<string, ProviderConnectionInfo> => {
  const map = new Map<string, ProviderConnectionInfo>();
  connections.forEach((connection) => {
    if (connection.status === 'ACTIVE') {
      const provider = connection.provider || connection.toolkit?.slug;
      if (provider) {
        const scopes = new Set<string>((connection.scopes || '').split(' ').filter(Boolean));
        map.set(provider, {
          scopes,
          connectionId: connection.id,
        });
      }
    }
  });
  return map;
};

const buildIntegrationProviderMap = (tools: ToolMetadata[]): Map<IntegrationType, string> => {
  const map = new Map<IntegrationType, string>();
  tools.forEach((tool) => {
    const integrationType = getIntegrationType(tool);
    if (integrationType && tool.provider) {
      map.set(integrationType, tool.provider);
    }
  });
  return map;
};

const buildIntegrationScopesMap = (tools: ToolMetadata[]): Map<IntegrationType, Set<string>> => {
  const map = new Map<IntegrationType, Set<string>>();
  tools.forEach((tool) => {
    const integrationType = getIntegrationType(tool);
    if (!integrationType) {
      return;
    }
    if (!map.has(integrationType)) {
      map.set(integrationType, new Set<string>());
    }
    const scopes = map.get(integrationType)!;
    tool.required_scopes.forEach((scope) => scopes.add(scope));
  });
  return map;
};

const buildToolStatusMap = (statuses: ToolConnectionStatus[] | null) => {
  if (!statuses) {
    return null;
  }
  const map = new Map<string, ToolConnectionStatus>();
  statuses.forEach((status) => {
    map.set(status.tool_name, status);
  });
  return map;
};

const getIntegrationProviderForType = (
  integrationType: IntegrationType,
  integrationProviderMap: Map<IntegrationType, string>,
) => {
  return getOAuthProvider(integrationType) ?? integrationProviderMap.get(integrationType) ?? null;
};

const getIntegrationScopesForType = (
  integrationType: IntegrationType,
  integrationScopesMap: Map<IntegrationType, Set<string>>,
) => {
  if (integrationScopesMap.has(integrationType)) {
    return Array.from(integrationScopesMap.get(integrationType)!);
  }
  return INTEGRATION_SCOPE_DEFAULTS[integrationType] ?? [];
};

const computeToolsWithStatus = ({
  tools,
  toolStatusMap,
  providerConnectionsMap,
  integrationProviderMap,
  integrationScopesMap,
}: {
  tools: ToolMetadata[];
  toolStatusMap: Map<string, ToolConnectionStatus> | null;
  providerConnectionsMap: Map<string, ProviderConnectionInfo>;
  integrationProviderMap: Map<IntegrationType, string>;
  integrationScopesMap: Map<IntegrationType, Set<string>>;
}): ToolIntegrationStatus[] => {
  return tools.map((tool) => {
    const integrationType = getIntegrationType(tool);
    const needsConnection = integrationNeedsConnection(integrationType);
    if (!needsConnection) {
      return {
        tool,
        integrationType: null,
        isConnected: true,
        connectionId: null,
        requiredScopes: [],
      };
    }

    const assuredIntegrationType = integrationType!;
    const requiredScopes =
      tool.required_scopes.length > 0
        ? tool.required_scopes
        : getIntegrationScopesForType(assuredIntegrationType, integrationScopesMap);

    if (toolStatusMap) {
      const status = toolStatusMap.get(tool.name);
      if (status) {
        const isConnected = status.has_required_scopes && (status.access_token_valid !== false);
        return {
          tool,
          integrationType: assuredIntegrationType,
          isConnected,
          connectionId: status.connection_id,
          requiredScopes,
        };
      }
    }

    const provider = getIntegrationProviderForType(assuredIntegrationType, integrationProviderMap);
    if (provider) {
      const providerConn = providerConnectionsMap.get(provider);
      if (providerConn) {
        const hasAllScopes = requiredScopes.length === 0
          ? false
          : requiredScopes.every((scope) => providerConn.scopes.has(scope));
        return {
          tool,
          integrationType: assuredIntegrationType,
          isConnected: hasAllScopes,
          connectionId: hasAllScopes ? providerConn.connectionId : null,
          requiredScopes,
        };
      }
    }

    return {
      tool,
      integrationType: assuredIntegrationType,
      isConnected: false,
      connectionId: null,
      requiredScopes,
    };
  });
};

const buildConnectedIntegrations = (
  toolsWithStatus: ToolIntegrationStatus[],
  integrationProviderMap: Map<IntegrationType, string>,
): Map<IntegrationType, ConnectedAccount> => {
  const map = new Map<IntegrationType, ConnectedAccount>();
  toolsWithStatus.forEach((status) => {
    if (status.integrationType && status.isConnected && !map.has(status.integrationType)) {
      map.set(status.integrationType, {
        id: status.connectionId ?? '',
        status: 'ACTIVE',
        toolkit: {
          slug: integrationProviderMap.get(status.integrationType) || status.integrationType,
        },
      });
    }
  });
  return map;
};

const deriveIntegrationData = ({
  tools,
  toolStatus,
  connections,
}: {
  tools: ToolMetadata[];
  toolStatus: ToolConnectionStatus[] | null;
  connections: ConnectedAccount[];
}) => {
  const integrationProviderMap = buildIntegrationProviderMap(tools);
  const integrationScopesMap = buildIntegrationScopesMap(tools);
  const providerConnectionsMap = buildProviderConnectionsMap(connections);
  const toolStatusMap = buildToolStatusMap(toolStatus);
  const toolsWithStatus = computeToolsWithStatus({
    tools,
    toolStatusMap,
    providerConnectionsMap,
    integrationProviderMap,
    integrationScopesMap,
  });
  const connectedIntegrations = buildConnectedIntegrations(toolsWithStatus, integrationProviderMap);
  return {
    integrationProviderMap,
    integrationScopesMap,
    providerConnectionsMap,
    toolStatusMap,
    toolsWithStatus,
    connectedIntegrations,
  };
};

export interface ToolsStore {
  userEmail: string | null;
  isAuthenticated: boolean;
  tools: ToolMetadata[];
  toolsLoading: boolean;
  toolsLoaded: boolean;
  toolsError: string | null;
  toolStatus: ToolConnectionStatus[] | null;
  toolStatusLoading: boolean;
  toolStatusLoaded: boolean;
  connections: ConnectedAccount[];
  connectionsLoading: boolean;
  connectionsLoaded: boolean;
  toolsWithStatus: ToolIntegrationStatus[];
  integrationProviderMap: Map<IntegrationType, string>;
  integrationScopesMap: Map<IntegrationType, Set<string>>;
  providerConnectionsMap: Map<string, ProviderConnectionInfo>;
  toolStatusMap: Map<string, ToolConnectionStatus> | null;
  connectedIntegrations: Map<IntegrationType, ConnectedAccount>;
  functionBlocks: FunctionBlockSchema[];
  functionBlocksByType: Map<string, FunctionBlockSchema>;
  functionBlocksLoading: boolean;
  functionBlocksLoaded: boolean;
  functionBlocksError: string | null;
  setUserContext: (payload: { email: string | null; isAuthenticated: boolean }) => void;
  loadIntegrationTools: () => Promise<ToolMetadata[]>;
  loadToolStatus: () => Promise<ToolConnectionStatus[] | null>;
  loadConnections: () => Promise<ConnectedAccount[]>;
  loadFromBootstrap: () => Promise<unknown | null>;
  refreshIntegrationTools: () => Promise<void>;
  getToolIntegrationStatus: (toolName: string) => ToolIntegrationStatus | null;
  isIntegrationConnected: (type: IntegrationType) => boolean;
  getConnectionId: (type: IntegrationType) => string | null;
  connectIntegration: (
    type: IntegrationType,
    options: { toolNames?: string[]; toolName?: string },
  ) => Promise<string | null>;
  loadFunctionBlocks: () => Promise<FunctionBlockSchema[]>;
}

const createToolsStore: StateCreator<ToolsStore> = (set, get) => {
  const syncDerived = () => {
    const { tools, toolStatus, connections } = get();
    const derived = deriveIntegrationData({ tools, toolStatus, connections });
    set(derived);
  };

  return {
    userEmail: null,
    isAuthenticated: false,
    tools: [],
    toolsLoading: false,
    toolsLoaded: false,
    toolsError: null,
    toolStatus: null,
    toolStatusLoading: false,
    toolStatusLoaded: false,
    connections: [],
    connectionsLoading: false,
    connectionsLoaded: false,
    toolsWithStatus: [],
    integrationProviderMap: new Map(),
    integrationScopesMap: new Map(),
    providerConnectionsMap: new Map(),
    toolStatusMap: null,
    connectedIntegrations: new Map(),
    functionBlocks: [],
    functionBlocksByType: new Map(),
    functionBlocksLoading: false,
    functionBlocksLoaded: false,
    functionBlocksError: null,
    setUserContext({ email, isAuthenticated }) {
      set({ userEmail: email, isAuthenticated });
    },
    async loadIntegrationTools() {
      if (!get().isAuthenticated) {
        set({ tools: [], toolsLoaded: false });
        syncDerived();
        return [];
      }
      set({ toolsLoading: true, toolsError: null });
      try {
        const response = await backendApiClient.request<{ tools: ToolMetadata[] }>('/api/tools', {
          method: 'GET',
        });
        set({ tools: response.tools, toolsLoaded: true, toolsLoading: false });
        syncDerived();
        return response.tools;
      } catch (error) {
        set({
          toolsLoading: false,
          toolsError: error instanceof Error ? error.message : 'Failed to load integration tools',
        });
        throw error;
      }
    },
    async loadToolStatus() {
      set({ toolStatusLoading: true });
      try {
        const response = await getToolsConnectionStatus();
        const statuses = response.tools || [];
        set({ toolStatus: statuses, toolStatusLoaded: true, toolStatusLoading: false });
        syncDerived();
        return statuses;
      } catch (error) {
        set({
          toolStatusLoading: false,
          toolStatusLoaded: false,
        });
        throw error;
      }
    },
    async loadConnections() {
      set({ connectionsLoading: true });
      try {
        const response = await listConnectedAccounts({});
        set({
          connections: response.items,
          connectionsLoaded: true,
          connectionsLoading: false,
        });
        syncDerived();
        return response.items;
      } catch (error) {
        set({ connectionsLoading: false, connectionsLoaded: false });
        throw error;
      }
    },
    async loadFromBootstrap() {
      const USE_BOOTSTRAP = import.meta.env.VITE_USE_BOOTSTRAP === 'true';

      if (!USE_BOOTSTRAP) {
        // Feature flag disabled, use individual calls
        return null;
      }

      if (!get().isAuthenticated) {
        return null;
      }

      // Prevent duplicate concurrent calls - if already loading, return null
      const state = get();
      if (state.toolsLoading || state.toolStatusLoading || state.connectionsLoading) {
        console.log('⏭️  Bootstrap already loading, skipping duplicate call');
        return null;
      }

      // If already loaded, don't fetch again
      if (state.toolsLoaded && state.toolStatusLoaded && state.connectionsLoaded) {
        console.log('✅ Bootstrap data already loaded, skipping duplicate call');
        return null;
      }

      try {
        set({
          toolsLoading: true,
          toolStatusLoading: true,
          connectionsLoading: true,
          toolsError: null
        });

        const bootstrapData = await getBootstrapData();

        // Extract and set all data from bootstrap response
        const tools = bootstrapData.tools as ToolMetadata[];
        const toolStatus = bootstrapData.tools_status;
        const connections = bootstrapData.connections;

        set({
          tools,
          toolsLoaded: true,
          toolsLoading: false,
          toolStatus,
          toolStatusLoaded: true,
          toolStatusLoading: false,
          connections,
          connectionsLoaded: true,
          connectionsLoading: false,
        });

        syncDerived();
        console.log('✅ Loaded data from bootstrap endpoint');
        return bootstrapData;
      } catch (error) {
        console.warn('⚠️ Bootstrap failed, falling back to individual calls:', error);
        set({
          toolsLoading: false,
          toolStatusLoading: false,
          connectionsLoading: false,
        });
        return null;
      }
    },
    async refreshIntegrationTools() {
      const state = get();

      // Prevent concurrent refreshes
      const isAlreadyLoading = state.toolsLoading || state.toolStatusLoading || state.connectionsLoading;
      if (isAlreadyLoading) {
        console.log('⏭️  Integration refresh already in progress, skipping');
        return;
      }

      // Try bootstrap first, fall back to individual calls if it fails or is disabled
      const bootstrapResult = await get().loadFromBootstrap();

      if (!bootstrapResult) {
        // Bootstrap failed or disabled, use individual calls
        await Promise.allSettled([
          get().loadIntegrationTools(),
          get().loadToolStatus(),
          get().loadConnections(),
        ]);
      }

      syncDerived();
    },
    getToolIntegrationStatus(toolName) {
      const { toolsWithStatus } = get();
      return toolsWithStatus.find((status) => status.tool.name === toolName) ?? null;
    },
    isIntegrationConnected(type) {
      return get().connectedIntegrations.has(type);
    },
    getConnectionId(type) {
      const { connectedIntegrations, integrationProviderMap, providerConnectionsMap } = get();
      const connected = connectedIntegrations.get(type);
      if (connected?.id) {
        return connected.id;
      }
      const provider = getIntegrationProviderForType(type, integrationProviderMap);
      if (!provider) {
        return null;
      }
      return providerConnectionsMap.get(provider)?.connectionId ?? null;
    },
    /* eslint-disable-next-line complexity */
    async connectIntegration(type, options) {
      const { userEmail, tools, integrationProviderMap, integrationScopesMap } = get();
      if (!userEmail) {
        console.error('[toolsStore] Cannot connect integration without user email.');
        return null;
      }
      if (!integrationNeedsConnection(type)) {
        console.warn(`[toolsStore] Integration ${type} does not require OAuth connection.`);
        return null;
      }
      const toolNames = options.toolNames ?? (options.toolName ? [options.toolName] : []);
      if (!toolNames.length) {
        console.error(`[toolsStore] connectIntegration requires toolNames for ${type}.`);
        return null;
      }
      const scopeSet = new Set<string>();
      toolNames.forEach((toolName) => {
        const tool = tools.find((t) => t.name === toolName);
        if (tool?.required_scopes?.length) {
          tool.required_scopes.forEach((scope) => scopeSet.add(scope));
        }
      });
      if (!scopeSet.size) {
        getIntegrationScopesForType(type, integrationScopesMap).forEach((scope) => scopeSet.add(scope));
      }
      if (!scopeSet.size) {
        console.error(`[toolsStore] No scopes available for integration type ${type}.`);
        return null;
      }
      const provider = getIntegrationProviderForType(type, integrationProviderMap);
      if (!provider && type !== 'sandbox') {
        console.error(`[toolsStore] No OAuth provider configured for ${type}`);
        return null;
      }
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await initiateConnection({
        userId: userEmail,
        provider: provider ?? type,
        scope: formatScopes(Array.from(scopeSet)),
        callbackUrl,
        integrationType: type,
      });
      return response.redirectUrl;
    },
    async loadFunctionBlocks() {
      set({ functionBlocksLoading: true, functionBlocksError: null });
      try {
        const response = await backendApiClient.request<NodeTypeResponse>(
          '/api/v1/builder/node-types',
          { method: 'GET' },
        );
        const blocks = response.node_types.map<FunctionBlockSchema>((nodeType) => ({
          type: nodeType.type as FunctionBlockSchema['type'],
          label: nodeType.title,
          category: 'Core',
          description: `${nodeType.title} block`,
          defaults: {},
          config_schema: {
            type: 'object',
            properties: nodeType.fields.reduce<Record<string, unknown>>((acc, field) => {
              acc[field.name] = { type: 'string', description: field.kind };
              return acc;
            }, {}),
          },
        }));
        const map = new Map<string, FunctionBlockSchema>();
        blocks.forEach((block) => {
          map.set(block.type, block);
        });
        set({
          functionBlocks: blocks,
          functionBlocksByType: map,
          functionBlocksLoading: false,
          functionBlocksLoaded: true,
        });
        return blocks;
      } catch (error) {
        set({
          functionBlocksLoading: false,
          functionBlocksError: error instanceof Error ? error.message : 'Failed to load function blocks',
        });
        throw error;
      }
    },
  };
};

export const useToolsStore = createStore(createToolsStore);

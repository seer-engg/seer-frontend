/**
 * Block Configuration Panel
 *
 * Right sidebar panel for configuring selected block.
 * Supports editing parameters and OAuth scopes.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Node } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

import {
  collectAvailableVariables,
  useTemplateAutocomplete,
  ToolBlockSection,
  LlmBlockSection,
  IfElseBlockSection,
  ForLoopBlockSection,
  ToolMetadata,
} from '../block-config';
import { WorkflowEdge, WorkflowNodeData, WorkflowNodeUpdateOptions } from '../types';
import { backendApiClient } from '@/lib/api-client';
import type { InputDef, JsonObject } from '@/types/workflow-spec';
import { ToolBlockConfig } from '@/components/workflows/block-config/types';

// Helper function to build merged config with proper fields handling
function buildMergedConfig(
  originalConfig: ToolBlockConfig,
  currentConfig: ToolBlockConfig,
  currentInputRefs: Record<string, string>,
): ToolBlockConfig {
  const mergedConfig: ToolBlockConfig = {
    ...originalConfig,
    ...currentConfig,
    input_refs: currentInputRefs,
    output_schema: currentConfig.output_schema,
  };

  // Always include fields array if it exists in currentConfig (even if empty)
  if ('fields' in currentConfig) {
    mergedConfig.fields = currentConfig.fields;
  }

  return mergedConfig;
}

// Helper function to check if Supabase binding is required
function validateSupabaseBinding(
  toolSchema: ToolMetadata | undefined,
  config: ToolBlockConfig,
): { isValid: boolean; error?: string } {
  const requiresSupabaseBinding = toolSchema?.integration_type === 'supabase';
  if (requiresSupabaseBinding && !config?.params?.integration_resource_id) {
    return {
      isValid: false,
      error: 'Supabase project required',
    };
  }
  return { isValid: true };
}

// Helper function to check if config has changes
function hasConfigChanges(params: {
  currentConfig: ToolBlockConfig;
  currentInputRefs: Record<string, string>;
  currentOauthScope: string | undefined;
  originalConfig: ToolBlockConfig;
  originalInputRefs: Record<string, string>;
  originalOauthScope: string | undefined;
}): boolean {
  return (
    JSON.stringify(params.currentConfig) !== JSON.stringify(params.originalConfig) ||
    params.currentOauthScope !== params.originalOauthScope ||
    JSON.stringify(params.currentInputRefs) !== JSON.stringify(params.originalInputRefs)
  );
}

// Helper function to handle save with validation
async function handleConfigSave(params: {
  node: Node<WorkflowNodeData>;
  toolSchema: ToolMetadata | undefined;
  config: ToolBlockConfig;
  inputRefs: Record<string, string>;
  oauthScope: string | undefined;
  onUpdate: (
    nodeId: string,
    updates: Partial<WorkflowNodeData>,
    options?: WorkflowNodeUpdateOptions,
  ) => Promise<void> | void;
}): Promise<void> {
  const { node, toolSchema, config, inputRefs, oauthScope, onUpdate } = params;

  const validation = validateSupabaseBinding(toolSchema, config);
  if (!validation.isValid) {
    toast.error(validation.error!, {
      description: 'Select and bind a Supabase project before saving this tool.',
    });
    return;
  }

  const originalConfig = node.data.config || {};
  const mergedConfig = buildMergedConfig(originalConfig, config, inputRefs);

  try {
    await onUpdate(
      node.id,
      {
        config: mergedConfig,
        oauth_scope: oauthScope,
      },
      { persist: true },
    );
    toast.success('Configuration saved', {
      description: 'Block configuration has been saved successfully',
      duration: 2000,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to save block configuration';
    toast.error('Failed to save configuration', {
      description: message,
    });
  }
}

// Helper function to notify parent of config changes
function notifyConfigChange(params: {
  node: Node<WorkflowNodeData> | null;
  config: ToolBlockConfig;
  inputRefs: Record<string, string>;
  oauthScope: string | undefined;
  lastSyncedNodeId: string | null;
  onChange?: (config: ToolBlockConfig, oauthScope?: string) => void;
}): void {
  const { node, config, inputRefs, oauthScope, lastSyncedNodeId, onChange } = params;

  if (!onChange || !node) return;

  // Only notify if we've synced the node already (avoid triggering on initial load)
  if (lastSyncedNodeId !== node.id) {
    console.log('[BlockConfigPanel] Skipping onChange (not synced yet):', {
      nodeType: node.data.type,
      currentNodeId: node.id,
      syncedNodeId: lastSyncedNodeId,
    });
    return;
  }

  // Include inputRefs in the config so dialog can detect changes to template variables
  const mergedConfig = {
    ...config,
    input_refs: inputRefs,
  };

  console.log('[BlockConfigPanel] Calling onChange:', {
    nodeType: node.data.type,
    nodeId: node.id,
    configKeys: Object.keys(config),
    mergedConfigKeys: Object.keys(mergedConfig),
    config,
  });

  onChange(mergedConfig, oauthScope);
}

// Helper function to initialize/reset node sync state
function initializeNodeSyncState(params: {
  node: Node<WorkflowNodeData> | null;
  lastSyncedNodeStateRef: React.MutableRefObject<{ nodeId: string | null; signature: string }>;
}): void {
  const { node, lastSyncedNodeStateRef } = params;

  if (node) {
    // Only set nodeId if it's a different node
    if (lastSyncedNodeStateRef.current.nodeId !== node.id) {
      lastSyncedNodeStateRef.current.nodeId = node.id;
      // Keep existing signature to trigger sync effect
      // (signature will be updated by the main sync effect)
    }
  } else {
    // Reset when no node
    lastSyncedNodeStateRef.current = {
      nodeId: null,
      signature: '',
    };
  }
}

// Helper function to trigger live update with debounce
function triggerLiveUpdate(params: {
  node: Node<WorkflowNodeData>;
  liveUpdateDelayMs: number;
  liveUpdateTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  configRef: React.MutableRefObject<ToolBlockConfig>;
  inputRefsRef: React.MutableRefObject<Record<string, string>>;
  oauthScopeRef: React.MutableRefObject<string | undefined>;
  onUpdate: (
    nodeId: string,
    updates: Partial<WorkflowNodeData>,
    options?: WorkflowNodeUpdateOptions,
  ) => Promise<void> | void;
}): void {
  const { node, liveUpdateDelayMs, liveUpdateTimeoutRef, configRef, inputRefsRef, oauthScopeRef, onUpdate } = params;

  if (liveUpdateTimeoutRef.current) {
    clearTimeout(liveUpdateTimeoutRef.current);
  }

  liveUpdateTimeoutRef.current = setTimeout(() => {
    // Use refs to get latest values when timeout fires
    const latestConfig = configRef.current;
    const latestInputRefs = inputRefsRef.current;
    const latestOauthScope = oauthScopeRef.current;

    const originalConfig = node.data.config || {};
    const mergedConfig = buildMergedConfig(originalConfig, latestConfig, latestInputRefs);

    const updatePayload: Partial<WorkflowNodeData> = {
      config: mergedConfig,
      oauth_scope: latestOauthScope,
    };

    void onUpdate(node.id, updatePayload);
    liveUpdateTimeoutRef.current = null;
  }, liveUpdateDelayMs);
}

interface BlockSectionProps {
  node: Node<WorkflowNodeData>;
  config: ToolBlockConfig;
  setConfig: (config: ToolBlockConfig) => void;
  toolSchema?: ToolMetadata;
  templateAutocomplete: ReturnType<typeof useTemplateAutocomplete>;
  validationErrors: Record<string, string>;
  useStructuredOutput: boolean;
  setUseStructuredOutput: (value: boolean) => void;
  structuredOutputSchema?: JsonObject;
  onStructuredOutputSchemaChange: (schema?: JsonObject) => void;
}

// Helper component to render block-specific config sections
function BlockSection({
  node,
  config,
  setConfig,
  toolSchema,
  templateAutocomplete,
  validationErrors,
  useStructuredOutput,
  setUseStructuredOutput,
  structuredOutputSchema,
  onStructuredOutputSchemaChange,
}: BlockSectionProps) {
  if (node.data.type === 'code') {
    return (
      <div className="text-sm text-muted-foreground">
        Code blocks are temporarily disabled while we migrate to the new workflow engine.
      </div>
    );
  }

  switch (node.data.type) {
    case 'tool':
      return (
        <ToolBlockSection
          config={config}
          setConfig={setConfig}
          toolSchema={toolSchema}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
        />
      );
    case 'llm':
      return (
        <LlmBlockSection
          config={config}
          setConfig={setConfig}
          useStructuredOutput={useStructuredOutput}
          setUseStructuredOutput={setUseStructuredOutput}
          structuredOutputSchema={structuredOutputSchema}
          onStructuredOutputSchemaChange={onStructuredOutputSchemaChange}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
        />
      );
    case 'if_else':
      return (
        <IfElseBlockSection
          config={config}
          setConfig={setConfig}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
        />
      );
    case 'for_loop':
      return (
        <ForLoopBlockSection
          config={config}
          setConfig={setConfig}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
        />
      );
    default:
      return null;
  }
}

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (
    nodeId: string,
    updates: Partial<WorkflowNodeData>,
    options?: WorkflowNodeUpdateOptions,
  ) => Promise<void> | void;
  allNodes?: Node<WorkflowNodeData>[]; // All nodes in workflow for reference dropdown
  allEdges?: WorkflowEdge[];
  autoSave?: boolean; // Enable auto-save on unmount (default: true for backward compatibility)
  variant?: 'panel' | 'inline';
  liveUpdate?: boolean;
  liveUpdateDelayMs?: number;
  workflowInputs?: Record<string, InputDef>;
  showSaveButton?: boolean; // Explicitly control save button visibility (default: auto-detect)
  validationErrors?: Record<string, string>; // Validation errors from parent
  onChange?: (config: ToolBlockConfig, oauthScope?: string) => void; // Notify parent of local changes (for button enable, not for parent state update)
}

// eslint-disable-next-line complexity, max-lines-per-function
export function BlockConfigPanel({
  node,
  onUpdate,
  allNodes = [],
  allEdges = [],
  autoSave = true,
  variant = 'panel',
  liveUpdate = false,
  liveUpdateDelayMs = 350,
  workflowInputs,
  showSaveButton,
  validationErrors = {},
  onChange,
}: BlockConfigPanelProps) {
  const [config, setConfig] = useState<ToolBlockConfig>({});
  const [oauthScope, setOAuthScope] = useState<string | undefined>();
  const [inputRefs, setInputRefs] = useState<Record<string, string>>({});
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  const [structuredOutputSchema, setStructuredOutputSchema] = useState<JsonObject | undefined>();
  const lastSyncedNodeStateRef = useRef<{ nodeId: string | null; signature: string }>({
    nodeId: null,
    signature: '',
  });
  
  // Use refs to track latest values for auto-save on unmount
  const configRef = useRef(config);
  const inputRefsRef = useRef(inputRefs);
  const oauthScopeRef = useRef(oauthScope);
  const isSavingRef = useRef(false); // Track if save is in progress to prevent concurrent saves
  const originalNodeRef = useRef(node); // Track original node to detect changes
  const liveUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    configRef.current = config;
    inputRefsRef.current = inputRefs;
    oauthScopeRef.current = oauthScope;
  }, [config, inputRefs, oauthScope]);

  // Notify parent of local state changes (for change detection only, doesn't trigger parent state update)
  useEffect(() => {
    notifyConfigChange({
      node,
      config,
      inputRefs,
      oauthScope,
      lastSyncedNodeId: lastSyncedNodeStateRef.current.nodeId,
      onChange,
    });
  }, [config, inputRefs, oauthScope, onChange, node]);

  // Initialize lastSyncedNodeStateRef.nodeId immediately when node changes
  // This ensures onChange can fire even if user edits before sync completes
  useEffect(() => {
    initializeNodeSyncState({ node, lastSyncedNodeStateRef });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]); // Only run when node ID changes, not on every node property change

  const toolName = config.tool_name || config.toolName || '';

  // Fetch tool schema for tool blocks to determine input handles
  const { data: toolSchema } = useQuery<ToolMetadata | undefined>({
    queryKey: ['tool-schema', toolName],
    queryFn: async () => {
      if (!toolName || node?.data.type !== 'tool') return undefined;
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools.find(t => t.name === toolName);
    },
    enabled: !!toolName && node?.data.type === 'tool',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const availableVariables = useMemo(
    () => collectAvailableVariables(allNodes, allEdges, node, workflowInputs),
    [allNodes, allEdges, node, workflowInputs],
  );
  const templateAutocomplete = useTemplateAutocomplete(availableVariables);

  useEffect(() => {
    if (!node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const signature = JSON.stringify({
      config: nodeConfig,
      oauth_scope: node.data.oauth_scope,
      input_refs: node.data.config?.input_refs || {},
      // Include fields in signature to ensure sync when fields change
      fields: nodeConfig.fields,
    });

    if (
      lastSyncedNodeStateRef.current.nodeId === node.id &&
      lastSyncedNodeStateRef.current.signature === signature
    ) {
      return;
    }

    lastSyncedNodeStateRef.current = {
      nodeId: node.id,
      signature,
    };

    setConfig(nodeConfig);
    setOAuthScope(node.data.oauth_scope);
    setInputRefs(node.data.config?.input_refs || {});
    setUseStructuredOutput(!!nodeConfig.output_schema);
    setStructuredOutputSchema(nodeConfig.output_schema);
    originalNodeRef.current = node; // Update original node reference
  }, [node]);

  const handleStructuredOutputSchemaChange = useCallback(
    (schema?: JsonObject) => {
      setStructuredOutputSchema(schema);
      setConfig(prev => {
        if (schema) {
          return { ...prev, output_schema: schema };
        }
        const next = { ...prev };
        delete next.output_schema;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!liveUpdate || !node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const nodeInputRefs = node.data.config?.input_refs || {};

    // Use refs to get latest values for comparison and saving
    const currentConfig = configRef.current;
    const currentInputRefs = inputRefsRef.current;
    const currentOauthScope = oauthScopeRef.current;

    // Check for changes
    const changesDetected = hasConfigChanges({
      currentConfig,
      currentInputRefs,
      currentOauthScope,
      originalConfig: nodeConfig,
      originalInputRefs: nodeInputRefs,
      originalOauthScope: node.data.oauth_scope,
    });

    if (!changesDetected) {
      return;
    }

    triggerLiveUpdate({
      node,
      liveUpdateDelayMs,
      liveUpdateTimeoutRef,
      configRef,
      inputRefsRef,
      oauthScopeRef,
      onUpdate,
    });

    return () => {
      if (liveUpdateTimeoutRef.current) {
        clearTimeout(liveUpdateTimeoutRef.current);
        liveUpdateTimeoutRef.current = null;
      }
    };
  }, [
    config, // Include config to trigger effect when it changes
    inputRefs,
    oauthScope,
    liveUpdate,
    liveUpdateDelayMs,
    node,
    onUpdate,
  ]);

  // Auto-save config changes when component unmounts (modal closes)
  // Only runs if autoSave is enabled (default true for backward compatibility)
  useEffect(() => {
    if (!autoSave) return; // Skip auto-save if disabled
    
    return () => {
      // Auto-save when component unmounts (modal closes)
      // Use refs to get latest values
      if (node && !isSavingRef.current) {
        const originalNode = originalNodeRef.current;
        if (!originalNode) return;
        
        // Check if data actually changed before saving
        const changesDetected = hasConfigChanges({
          currentConfig: configRef.current,
          currentInputRefs: inputRefsRef.current,
          currentOauthScope: oauthScopeRef.current,
          originalConfig: originalNode.data.config || {},
          originalInputRefs: originalNode.data.config?.input_refs || {},
          originalOauthScope: originalNode.data.oauth_scope,
        });

        if (changesDetected) {
          isSavingRef.current = true;
          const originalConfig = originalNode.data.config || {};
          const mergedConfig = buildMergedConfig(originalConfig, configRef.current, inputRefsRef.current);
          
          void onUpdate(originalNode.id, {
            config: mergedConfig,
            oauth_scope: oauthScopeRef.current,
          });
          // Reset flag after a delay to allow save to complete
          setTimeout(() => {
            isSavingRef.current = false;
          }, 1000);
        }
      }
    };
  }, [node, onUpdate, autoSave]); // Include autoSave in dependencies

  if (!node) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a block to configure
      </div>
    );
  }

  const shouldShowSaveButton = showSaveButton ?? (!autoSave && !liveUpdate);
  const saveButton = shouldShowSaveButton ? (
    <Button
      onClick={() =>
        void handleConfigSave({
          node,
          toolSchema,
          config,
          inputRefs,
          oauthScope,
          onUpdate,
        })
      }
      className="w-full"
      size="sm"
    >
      <Save className="w-4 h-4 mr-2" />
      Save Configuration
    </Button>
  ) : null;

  if (variant === 'inline') {
    return (
      <div className="space-y-2 w-fit">
        <BlockSection
          node={node}
          config={config}
          setConfig={setConfig}
          toolSchema={toolSchema}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
          useStructuredOutput={useStructuredOutput}
          setUseStructuredOutput={setUseStructuredOutput}
          structuredOutputSchema={structuredOutputSchema}
          onStructuredOutputSchemaChange={handleStructuredOutputSchemaChange}
        />
        {saveButton}
      </div>
    );
  }

  return (
    <Card className="w-fit">
      <CardContent className="p-4 space-y-2 w-fit">
        <BlockSection
          node={node}
          config={config}
          setConfig={setConfig}
          toolSchema={toolSchema}
          templateAutocomplete={templateAutocomplete}
          validationErrors={validationErrors}
          useStructuredOutput={useStructuredOutput}
          setUseStructuredOutput={setUseStructuredOutput}
          structuredOutputSchema={structuredOutputSchema}
          onStructuredOutputSchemaChange={handleStructuredOutputSchemaChange}
        />
        {saveButton}
      </CardContent>
    </Card>
  );
}

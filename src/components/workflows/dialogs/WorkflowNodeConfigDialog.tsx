
import { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { BlockConfigPanel } from '../panels/BlockConfigPanel';
import { WorkflowEdge, WorkflowNodeData, WorkflowNodeUpdateOptions, ToolBlockConfig } from '../types';
import type { InputDef } from '@/types/workflow-spec';
import { backendApiClient } from '@/lib/api-client';
import { ToolMetadata } from '../block-config';
import {
  validateToolConfig,
  validateLlmConfig,
  validateIfElseConfig,
  validateForLoopConfig,
  type ValidationResult,
} from '../block-config/validation';

interface WorkflowNodeConfigDialogProps {
  open: boolean;
  node: Node<WorkflowNodeData> | null;
  allNodes: Node<WorkflowNodeData>[];
  allEdges: WorkflowEdge[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (
    nodeId: string,
    updates: Partial<WorkflowNodeData>,
    options?: WorkflowNodeUpdateOptions,
  ) => Promise<void> | void;
  workflowInputs?: Record<string, InputDef>;
}

export function WorkflowNodeConfigDialog({
  open,
  node,
  allNodes,
  allEdges,
  onOpenChange,
  onUpdate,
  workflowInputs,
}: WorkflowNodeConfigDialogProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Track local edits from BlockConfigPanel (for change detection and autosave)
  const [localConfig, setLocalConfig] = useState<ToolBlockConfig | null>(null);
  const [localOauthScope, setLocalOauthScope] = useState<string | undefined>(undefined);

  // Track original node for comparison
  const originalNodeRef = useRef<Node<WorkflowNodeData> | null>(null);

  // Fetch tool schema for tool blocks (for validation)
  const toolName = node?.data.type === 'tool' ? (node.data.config?.tool_name || node.data.config?.toolName) : '';
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
    staleTime: 5 * 60 * 1000,
  });

  // Reset when node changes
  useEffect(() => {
    if (node?.id !== originalNodeRef.current?.id) {
      originalNodeRef.current = node ? JSON.parse(JSON.stringify(node)) : null;
      setLocalConfig(null);
      setLocalOauthScope(undefined);
      console.log('[WorkflowNodeConfigDialog] Node changed, reset state:', {
        nodeType: node?.data.type,
        nodeId: node?.id,
        originalConfig: originalNodeRef.current?.data.config,
      });
    }
  }, [node?.id]);

  // Validate configuration (use local state if available)
  useEffect(() => {
    if (!node) {
      setValidationErrors({});
      return;
    }

    // Use local config if available, otherwise fall back to node config
    const configToValidate = localConfig ?? node.data.config;
    let validation: ValidationResult;

    switch (node.data.type) {
      case 'tool':
        const paramSchema = toolSchema?.parameters?.properties || {};
        const requiredParams = toolSchema?.parameters?.required || [];
        validation = validateToolConfig(configToValidate, paramSchema, requiredParams);
        break;
      case 'llm':
        validation = validateLlmConfig(configToValidate);
        break;
      case 'if_else':
        validation = validateIfElseConfig(configToValidate);
        break;
      case 'for_loop':
        validation = validateForLoopConfig(configToValidate);
        break;
      default:
        validation = { isValid: true, errors: {} };
    }

    setValidationErrors(validation.errors);
  }, [node, localConfig, toolSchema]);

  // Compute validation state
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Debounced autosave hook - saves changes after 800ms of inactivity
  const { triggerSave } = useDebouncedAutosave({
    data: { localConfig, localOauthScope, nodeId: node?.id },
    onSave: async (data) => {
      if (!node) return;

      // Use local state if available, otherwise fall back to node state
      const finalConfig = data.localConfig ?? node.data.config;
      const finalOauthScope = data.localOauthScope ?? node.data.oauth_scope;

      await onUpdate(
        node.id,
        {
          config: finalConfig,
          oauth_scope: finalOauthScope,
        },
        { persist: true },
      );

      // Update original ref with the saved state
      originalNodeRef.current = node
        ? JSON.parse(
            JSON.stringify({
              ...node,
              data: { ...node.data, config: finalConfig, oauth_scope: finalOauthScope },
            }),
          )
        : null;
    },
    options: {
      delay: 800,
      enabled: open, // Allow autosave even with validation errors - save work-in-progress
    },
  });

  // Trigger autosave when local config changes
  useEffect(() => {
    if (!node || !originalNodeRef.current || !localConfig) return;

    // Only trigger when we have LOCAL changes (not when node updates from elsewhere)
    const currentConfig = localConfig;
    const currentOauth = localOauthScope ?? node.data.oauth_scope;
    const originalConfig = originalNodeRef.current.data.config;
    const originalOauth = originalNodeRef.current.data.oauth_scope;

    const hasChanges =
      JSON.stringify(currentConfig) !== JSON.stringify(originalConfig) ||
      currentOauth !== originalOauth;

    console.log('[WorkflowNodeConfigDialog] Checking for changes:', {
      nodeType: node.data.type,
      hasChanges,
      hasValidationErrors,
      localConfigExists: !!localConfig,
      currentConfig,
      originalConfig,
    });

    if (hasChanges) {
      console.log('[WorkflowNodeConfigDialog] Triggering autosave for', node.data.type);
      triggerSave();
    }
  }, [localConfig, localOauthScope, triggerSave]);

  // Handle local config changes from BlockConfigPanel
  const handleLocalConfigChange = useCallback(
    (config: ToolBlockConfig, oauthScope?: string) => {
      // BlockConfigPanel includes input_refs in the merged config, but we need to extract it
      // to compare properly with the original node config
      const { input_refs, ...configWithoutRefs } = config;

      console.log('[WorkflowNodeConfigDialog] Local config changed:', {
        config: configWithoutRefs,
        input_refs,
        oauthScope,
        nodeType: node?.data.type,
        nodeId: node?.id,
      });

      // Store the config WITHOUT input_refs (input_refs are handled separately by BlockConfigPanel)
      setLocalConfig(configWithoutRefs as ToolBlockConfig);
      setLocalOauthScope(oauthScope);
    },
    [node]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="text-left">
          <DialogTitle>{node?.data.label ?? 'Configure block'}</DialogTitle>
          <DialogDescription>
            Update block parameters, inputs, and outputs. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          {node ? (
            <BlockConfigPanel
              node={node}
              onUpdate={onUpdate}
              allNodes={allNodes}
              allEdges={allEdges}
              autoSave={false}
              variant="inline"
              liveUpdate={false}
              showSaveButton={false}
              validationErrors={validationErrors}
              onChange={handleLocalConfigChange}
              workflowInputs={workflowInputs}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a block to configure.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}




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
import { WorkflowEdge, WorkflowNodeData, WorkflowNodeUpdateOptions } from '../types';
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
import { ToolBlockConfig } from '@/components/workflows/block-config/types';

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

// Helper: Validate node configuration
const useNodeValidation = (
  node: Node<WorkflowNodeData> | null,
  localConfig: ToolBlockConfig | null,
  toolSchema: ToolMetadata | undefined
) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!node) {
      setValidationErrors({});
      return;
    }

    const configToValidate = localConfig ?? node.data.config;
    let validation: ValidationResult;

    switch (node.data.type) {
      case 'tool': {
        const paramSchema = toolSchema?.parameters?.properties || {};
        const requiredParams = toolSchema?.parameters?.required || [];
        validation = validateToolConfig(configToValidate, paramSchema, requiredParams);
        break;
      }
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

  return { validationErrors, hasValidationErrors: Object.keys(validationErrors).length > 0 };
};

// Helper: Auto-trigger save when local config changes
const useAutoTriggerSave = (opts: {
  node: Node<WorkflowNodeData> | null;
  localConfig: ToolBlockConfig | null;
  localOauthScope: string | undefined;
  originalNodeRef: React.MutableRefObject<Node<WorkflowNodeData> | null>;
  triggerSave: () => void;
  hasValidationErrors: boolean;
}) => {
  useEffect(() => {
    if (!opts.node || !opts.originalNodeRef.current || !opts.localConfig) return;

    const currentConfig = opts.localConfig;
    const currentOauth = opts.localOauthScope ?? opts.node.data.oauth_scope;
    const originalConfig = opts.originalNodeRef.current.data.config;
    const originalOauth = opts.originalNodeRef.current.data.oauth_scope;

    const hasChanges =
      JSON.stringify(currentConfig) !== JSON.stringify(originalConfig) ||
      currentOauth !== originalOauth;

    console.log('[WorkflowNodeConfigDialog] Checking for changes:', {
      nodeType: opts.node.data.type,
      hasChanges,
      hasValidationErrors: opts.hasValidationErrors,
      localConfigExists: !!opts.localConfig,
      currentConfig,
      originalConfig,
    });

    if (hasChanges) {
      console.log('[WorkflowNodeConfigDialog] Triggering autosave for', opts.node.data.type);
      opts.triggerSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.localConfig, opts.localOauthScope, opts.triggerSave]);
};

export function WorkflowNodeConfigDialog({
  open,
  node,
  allNodes,
  allEdges,
  onOpenChange,
  onUpdate,
  workflowInputs,
}: WorkflowNodeConfigDialogProps) {
  const [localConfig, setLocalConfig] = useState<ToolBlockConfig | null>(null);
  const [localOauthScope, setLocalOauthScope] = useState<string | undefined>(undefined);
  const originalNodeRef = useRef<Node<WorkflowNodeData> | null>(null);

  // Fetch tool schema for validation
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  // Validate configuration
  const { validationErrors, hasValidationErrors } = useNodeValidation(node, localConfig, toolSchema);

  // Debounced autosave
  const { triggerSave } = useDebouncedAutosave({
    data: { localConfig, localOauthScope, nodeId: node?.id },
    onSave: async (data) => {
      if (!node) return;
      const finalConfig = data.localConfig ?? node.data.config;
      const finalOauthScope = data.localOauthScope ?? node.data.oauth_scope;
      await onUpdate(node.id, { config: finalConfig, oauth_scope: finalOauthScope }, { persist: true });
      originalNodeRef.current = node
        ? JSON.parse(JSON.stringify({ ...node, data: { ...node.data, config: finalConfig, oauth_scope: finalOauthScope } }))
        : null;
    },
    options: { delay: 800, enabled: open },
  });

  // Auto-trigger save on changes
  useAutoTriggerSave({ node, localConfig, localOauthScope, originalNodeRef, triggerSave, hasValidationErrors });

  // Handle config changes
  const handleLocalConfigChange = useCallback(
    (config: ToolBlockConfig, oauthScope?: string) => {
      const { input_refs, ...configWithoutRefs } = config;
      console.log('[WorkflowNodeConfigDialog] Local config changed:', {
        config: configWithoutRefs,
        input_refs,
        oauthScope,
        nodeType: node?.data.type,
        nodeId: node?.id,
      });
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
            <p className="text-sm text-muted-foreground">Select a block to configure.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



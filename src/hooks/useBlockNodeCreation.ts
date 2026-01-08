import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { toast } from '@/components/ui/sonner';
import type {
  WorkflowNodeData,
  FunctionBlockSchema,
  GmailIntegrationContext,
  SupabaseIntegrationContext,
} from '@/components/workflows/types';
import type { TriggerDescriptor } from '@/types/triggers';
import type { InputDef } from '@/types/workflow-spec';
import { buildIntegrationMetadata, generateNodeId, createTriggerNodeData, createBlockNodeData } from '@/lib/workflow-nodes';

interface CreateTriggerNodeOptions {
  triggerKey: string;
  label: string;
  descriptor: TriggerDescriptor;
  workflowInputs: Record<string, InputDef>;
  gmailIntegration?: GmailIntegrationContext;
  supabaseIntegration?: SupabaseIntegrationContext;
  position: { x: number; y: number };
}
interface CreateBlockNodeOptions {
  type: string;
  label: string;
  config?: Record<string, unknown>;
  position: { x: number; y: number };
}
interface UseBlockNodeCreationOptions {
  functionBlocksMap: Map<string, FunctionBlockSchema>;
  triggerCatalog: TriggerDescriptor[];
  workflowInputsDef: Record<string, InputDef>;
  gmailIntegrationReady: boolean;
  gmailConnectionId?: number | null;
  handleConnectGmail?: () => void | Promise<void>;
  isConnectingGmail: boolean;
  withDefaultBlockConfig: (
    blockType: string,
    config: Record<string, unknown> | undefined,
    functionBlocksMap: Map<string, FunctionBlockSchema>
  ) => Record<string, unknown>;
}

/**
 * Hook to create workflow nodes (both trigger and regular block nodes).
 * Eliminates duplication between handleBlockSelect and handleNodeDrop.
 */
export function useBlockNodeCreation({
  functionBlocksMap,
  triggerCatalog,
  workflowInputsDef,
  gmailIntegrationReady,
  gmailConnectionId,
  handleConnectGmail,
  isConnectingGmail,
  withDefaultBlockConfig,
}: UseBlockNodeCreationOptions) {
  const createTriggerNode = useCallback(
    (options: CreateTriggerNodeOptions): Node<WorkflowNodeData> | null => {
      const { triggerKey, label, descriptor, workflowInputs, position, gmailIntegration, supabaseIntegration } =
        options;

      const integrationMeta = buildIntegrationMetadata(
        triggerKey,
        gmailIntegration,
        supabaseIntegration
      );

      return {
        id: generateNodeId('trigger'),
        type: 'trigger',
        position,
        data: createTriggerNodeData({
          triggerKey,
          label,
          descriptor,
          workflowInputs,
          integrationMeta,
        }),
      };
    },
    []
  );
  const createBlockNode = useCallback(
    (options: CreateBlockNodeOptions): Node<WorkflowNodeData> => {
      const { type, label, config, position } = options;
      const defaultConfig = withDefaultBlockConfig(type, config, functionBlocksMap);
      return {
        id: generateNodeId('block'),
        type,
        position,
        data: createBlockNodeData({ type, label, config: defaultConfig }),
      };
    },
    [functionBlocksMap, withDefaultBlockConfig]
  );
  const createNodeFromBlock = useCallback(
    (
      block: { type: string; label: string; config?: Record<string, unknown> },
      position: { x: number; y: number }
    ): Node<WorkflowNodeData> | null => {
      // Handle trigger blocks
      if (block.type === 'trigger' && block.config?.triggerKey) {
        const triggerKey = block.config.triggerKey as string;
        const descriptor = triggerCatalog.find((trigger) => trigger.key === triggerKey);

        if (!descriptor) {
          toast.error('Trigger metadata unavailable');
          return null;
        }

        return createTriggerNode({
          triggerKey,
          label: block.label,
          descriptor,
          workflowInputs: workflowInputsDef,
          position,
          gmailIntegration: {
            ready: gmailIntegrationReady,
            connectionId: gmailConnectionId,
            onConnect: handleConnectGmail,
            isConnecting: isConnectingGmail,
          },
        });
      }

      // Handle regular blocks
      return createBlockNode({
        type: block.type,
        label: block.label,
        config: block.config,
        position,
      });
    },
    [
      triggerCatalog,
      workflowInputsDef,
      gmailIntegrationReady,
      gmailConnectionId,
      handleConnectGmail,
      isConnectingGmail,
      createTriggerNode,
      createBlockNode,
    ]
  );

  return {
    createTriggerNode,
    createBlockNode,
    createNodeFromBlock,
  };
}

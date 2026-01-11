import { useCallback, useMemo, useRef } from 'react';
import type { Node } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowEdge,
  WorkflowNodeUpdateOptions,
  BlockSelectionPayload,
} from '@/components/workflows/types';
import { toast } from '@/components/ui/sonner';
import { useCanvasStore, useUIStore } from '@/stores';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useToolsStore } from '@/stores/toolsStore';
import { useTriggersStore } from '@/stores/triggersStore';
import { createTriggerNode, createRegularBlockNode } from '../components/workflows/canvas/nodeCreation';

/**
 * Consolidated node actions hook that combines:
 * - useNodeHandlers (add nodes, double-click, dialog management)
 * - useNodeConfigUpdate (update node config with autosave)
 *
 * Phase 3 refactoring: Fetches all required state directly from stores
 * instead of receiving it through props.
 */
export function useNodeActions({
  autosaveCallback,
  triggerSave,
  gmailIntegrationReady,
  gmailConnectionId,
  handleConnectGmail,
  isConnectingGmail,
}: {
  autosaveCallback: (data: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => Promise<void>;
  triggerSave: () => void;
  gmailIntegrationReady: boolean;
  gmailConnectionId: number | null;
  handleConnectGmail: () => void;
  isConnectingGmail: boolean;
}) {
  // Fetch required state from stores - FIXED: Individual selectors instead of useShallow
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId);
  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);

  const setConfigDialogOpen = useUIStore((state) => state.setConfigDialogOpen);

  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const currentWorkflow = useWorkflowStore((state) => state.currentWorkflow);
  const loadedWorkflow = currentWorkflow;

  const functionBlocksMap = useToolsStore((state) => state.functionBlocksByType);
  const triggerCatalog = useTriggersStore((state) => state.triggerCatalog);

  // Get workflow inputs definition from current workflow
  const workflowInputsDef = useMemo(
    () => loadedWorkflow?.spec?.inputs ?? {},
    [loadedWorkflow?.spec?.inputs],
  );

  // Ref to skip next autosave (used when persisting immediately)
  const skipNextAutosaveRef = useRef(false);

  // ==================== NODE HANDLERS ====================

  /**
   * Add a block to the canvas (from BuildPanel)
   */
  const handleBlockSelect = useCallback(
    (block: BlockSelectionPayload) => {
      const position = { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 };

      if (block.type === 'trigger' && block.config?.triggerKey) {
        const triggerKey = block.config.triggerKey;
        const descriptor = triggerCatalog.find((t) => t.key === triggerKey);

        if (!descriptor) {
          toast.error('Trigger metadata unavailable');
          return;
        }

        const newNode = createTriggerNode({
          triggerKey,
          descriptor,
          label: block.label,
          workflowInputsDef,
          gmailIntegrationReady,
          gmailConnectionId,
          handleConnectGmail,
          isConnectingGmail,
          position,
        });
        setNodes((nds) => [...nds, newNode]);
        triggerSave();
        return;
      }

      const newNode = createRegularBlockNode(block, position, functionBlocksMap);
      setNodes((nds) => [...nds, newNode]);
      triggerSave();
    },
    [
      triggerCatalog,
      workflowInputsDef,
      gmailIntegrationReady,
      gmailConnectionId,
      handleConnectGmail,
      isConnectingGmail,
      functionBlocksMap,
      setNodes,
      triggerSave,
    ],
  );

  /**
   * Handle node drop (from drag and drop)
   */
  const handleNodeDrop = useCallback(
    (block: BlockSelectionPayload, position: { x: number; y: number }) => {
      if (block.type === 'trigger' && block.config?.triggerKey) {
        const triggerKey = block.config.triggerKey;
        const descriptor = triggerCatalog.find((t) => t.key === triggerKey);

        if (!descriptor) {
          toast.error('Trigger metadata unavailable');
          return;
        }

        const newNode = createTriggerNode({
          triggerKey,
          descriptor,
          label: block.label,
          workflowInputsDef,
          gmailIntegrationReady,
          gmailConnectionId,
          handleConnectGmail,
          isConnectingGmail,
          position,
        });
        setNodes((nds) => [...nds, newNode]);
        triggerSave();
        return;
      }

      const newNode = createRegularBlockNode(block, position, functionBlocksMap);
      setNodes((nds) => [...nds, newNode]);
      triggerSave();
    },
    [
      triggerCatalog,
      workflowInputsDef,
      gmailIntegrationReady,
      gmailConnectionId,
      handleConnectGmail,
      isConnectingGmail,
      functionBlocksMap,
      setNodes,
      triggerSave,
    ],
  );

  /**
   * Handle double-click on canvas node (opens config dialog)
   */
  const handleCanvasNodeDoubleClick = useCallback(
    (node: Node<WorkflowNodeData>) => {
      if (node.type === 'trigger') return;
      setEditingNodeId(node.id);
      setConfigDialogOpen(true);
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, setConfigDialogOpen, setEditingNodeId],
  );

  /**
   * Handle config dialog open/close
   */
  const handleConfigDialogOpenChange = useCallback(
    (open: boolean) => {
      setConfigDialogOpen(open);
      if (!open) setEditingNodeId(null);
    },
    [setConfigDialogOpen, setEditingNodeId],
  );

  // ==================== NODE CONFIG UPDATE ====================

  /**
   * Update node configuration with optional immediate persistence
   */
  const handleNodeConfigUpdate = useCallback(
    async (
      nodeId: string,
      updates: Partial<WorkflowNodeData>,
      options?: WorkflowNodeUpdateOptions,
    ) => {
      const canPersistNow = Boolean(
        options?.persist &&
          selectedWorkflowId &&
          loadedWorkflow &&
          typeof loadedWorkflow.draft_revision === 'number',
      );

      if (canPersistNow) {
        skipNextAutosaveRef.current = true;
      }

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const mergedData: WorkflowNodeData = {
            ...node.data,
            ...updates,
          };

          if (updates.config) {
            const mergedConfig = {
              ...(node.data?.config || {}),
              ...updates.config,
            };

            if ('fields' in updates.config) {
              mergedConfig.fields = updates.config.fields;
            }

            mergedData.config = mergedConfig;
          }

          return {
            ...node,
            data: mergedData,
          };
        }),
      );

      if (!canPersistNow) {
        return;
      }

      const graph = {
        nodes: useCanvasStore.getState().nodes,
        edges: useCanvasStore.getState().edges,
      };

      try {
        await autosaveCallback(graph);
      } catch (error) {
        skipNextAutosaveRef.current = false;
        triggerSave();
        throw error;
      }
    },
    [autosaveCallback, loadedWorkflow, selectedWorkflowId, setNodes, triggerSave],
  );

  return {
    // Node handlers
    handleBlockSelect,
    handleNodeDrop,
    handleCanvasNodeDoubleClick,
    handleConfigDialogOpenChange,

    // Node config update
    handleNodeConfigUpdate,
    skipNextAutosaveRef,
  };
}

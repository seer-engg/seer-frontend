import { useCallback, useRef } from 'react';
import type { Node } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowEdge,
  WorkflowNodeUpdateOptions,
} from '@/components/workflows/types';
import type { WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { useCanvasStore } from '@/stores';

export interface UseNodeConfigUpdateParams {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  setNodes: (nodes: Node<WorkflowNodeData>[] | ((prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void;
  autosaveCallback: (data: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => Promise<void>;
  triggerSave: () => void;
}

export function useNodeConfigUpdate({
  selectedWorkflowId,
  loadedWorkflow,
  setNodes,
  autosaveCallback,
  triggerSave,
}: UseNodeConfigUpdateParams) {
  const skipNextAutosaveRef = useRef(false);

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
    handleNodeConfigUpdate,
    skipNextAutosaveRef,
  };
}

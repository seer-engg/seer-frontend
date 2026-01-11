import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData } from '@/components/workflows/types';

interface UseWorkflowLifecycleEffectsProps {
  autosaveStatus: string;
  nodes: Node<WorkflowNodeData>[];
  edges: unknown[];
  selectedWorkflowId: string | null;
  isLoadingWorkflow: boolean;
  editingNodeId: string | null;
  isPreviewActive: boolean;
  buildChatPanelCollapsed: boolean;
  triggerSave: () => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setConfigDialogOpen: (open: boolean) => void;
  loadTriggerCatalogIfNeeded: () => void;
  triggerHandlers: unknown;
  skipNextAutosaveRef: React.MutableRefObject<boolean>;
}

export function useWorkflowLifecycleEffects(props: UseWorkflowLifecycleEffectsProps) {
  const {
    autosaveStatus,
    nodes,
    edges,
    selectedWorkflowId,
    isLoadingWorkflow,
    editingNodeId,
    isPreviewActive,
    buildChatPanelCollapsed,
    triggerSave,
    setNodes,
    setSelectedNodeId,
    setEditingNodeId,
    setConfigDialogOpen,
    loadTriggerCatalogIfNeeded,
    triggerHandlers,
    skipNextAutosaveRef,
  } = props;

  // Trigger autosave when nodes or edges change
  useEffect(() => {
    if (!selectedWorkflowId || isLoadingWorkflow) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    triggerSave();
  }, [nodes, edges, selectedWorkflowId, triggerSave, isLoadingWorkflow, skipNextAutosaveRef]);

  // Handle autosave errors
  useEffect(() => {
    if (autosaveStatus === 'error') {
      toast.error('Autosave failed', {
        description: 'Your changes may not have been saved. Please save manually.',
        duration: 5000,
      });
    }
  }, [autosaveStatus]);

  // Populate handlers for trigger nodes
  useEffect(() => {
    const hasUnpopulatedTriggerNodes = nodes.some(
      (node) =>
        node.type === 'trigger' &&
        node.data.triggerMeta &&
        (!node.data.triggerMeta.handlers || Object.keys(node.data.triggerMeta.handlers).length === 0),
    );

    if (hasUnpopulatedTriggerNodes) {
      const updatedNodes = nodes.map((node) => {
        if (
          node.type === 'trigger' &&
          node.data.triggerMeta &&
          (!node.data.triggerMeta.handlers || Object.keys(node.data.triggerMeta.handlers).length === 0)
        ) {
          return {
            ...node,
            data: {
              ...node.data,
              triggerMeta: {
                ...node.data.triggerMeta,
                handlers: triggerHandlers,
              },
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
  }, [nodes, triggerHandlers, setNodes]);

  // Clear selection when preview is active
  useEffect(() => {
    if (isPreviewActive) {
      setSelectedNodeId(null);
    }
  }, [isPreviewActive, setSelectedNodeId]);

  // Load trigger catalog when Build panel is expanded
  useEffect(() => {
    if (!buildChatPanelCollapsed) {
      loadTriggerCatalogIfNeeded();
    }
  }, [buildChatPanelCollapsed, loadTriggerCatalogIfNeeded]);

  // Close dialog if editing node is deleted
  useEffect(() => {
    if (!editingNodeId) return;
    const exists = nodes.some((node) => node.id === editingNodeId);
    if (!exists) {
      setEditingNodeId(null);
      setConfigDialogOpen(false);
    }
  }, [editingNodeId, nodes, setConfigDialogOpen, setEditingNodeId]);
}

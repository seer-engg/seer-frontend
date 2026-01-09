import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { toast } from '@/components/ui/sonner';
import { BackendAPIError } from '@/lib/api-client';
import { normalizeNodes, normalizeEdges } from '@/lib/workflow-normalization';

export interface UseWorkflowAutosaveParams {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  functionBlocksMap: Map<string, unknown>;
  saveWorkflowDraft: (id: string, data: { graph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }; baseRevision: number }) => Promise<WorkflowModel>;
  getWorkflow: (id: string) => Promise<WorkflowModel>;
  setLoadedWorkflow: (workflow: WorkflowModel | null) => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setAutosaveStatus: (status: string) => void;
  setLastRunVersionId: (id: number | null) => void;
  invalidateWorkflowVersions: () => void;
  resetSavedDataRef: React.MutableRefObject<(() => void) | undefined>;
}

async function handleConflictError(params: {
  selectedWorkflowId: string;
  getWorkflow: (id: string) => Promise<WorkflowModel>;
  setLoadedWorkflow: (workflow: WorkflowModel | null) => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  functionBlocksMap: Map<string, unknown>;
  setLastRunVersionId: (id: number | null) => void;
  resetSavedDataRef: React.MutableRefObject<(() => void) | undefined>;
  invalidateWorkflowVersions: () => void;
}) {
  try {
    const latest = await params.getWorkflow(params.selectedWorkflowId);
    params.setLoadedWorkflow(latest);
    params.setNodes(normalizeNodes(latest.graph.nodes, params.functionBlocksMap));
    params.setEdges(normalizeEdges(latest.graph.edges));
    params.setLastRunVersionId(null);
    params.resetSavedDataRef.current?.();
    params.invalidateWorkflowVersions();
    toast.error('Draft conflict detected', {
      description: 'Reloaded the latest draft from the server. Please retry your change.',
    });
  } catch (error) {
    console.error('Failed to refresh workflow after conflict:', error);
    toast.error('Draft conflict detected', {
      description: 'Reload failed. Please refresh the page to continue.',
    });
  }
}

export function useWorkflowAutosave(params: UseWorkflowAutosaveParams) {
  const {
    selectedWorkflowId,
    loadedWorkflow,
    functionBlocksMap,
    saveWorkflowDraft,
    getWorkflow,
    setLoadedWorkflow,
    setNodes,
    setEdges,
    setAutosaveStatus,
    setLastRunVersionId,
    invalidateWorkflowVersions,
    resetSavedDataRef,
  } = params;

  const autosaveCallback = useCallback(
    async (data: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        return;
      }

      const baseRevision = loadedWorkflow.draft_revision;
      if (typeof baseRevision !== 'number') {
        return;
      }

      setAutosaveStatus('saving');
      try {
        const updated = await saveWorkflowDraft(selectedWorkflowId, {
          graph: { nodes: data.nodes, edges: data.edges },
          baseRevision,
        });
        setLoadedWorkflow(updated);
        if (updated.draft_revision !== baseRevision) {
          setLastRunVersionId(null);
        }
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (error) {
        if (error instanceof BackendAPIError && error.status === 409) {
          await handleConflictError({
            selectedWorkflowId,
            getWorkflow,
            setLoadedWorkflow,
            setNodes,
            setEdges,
            functionBlocksMap,
            setLastRunVersionId,
            resetSavedDataRef,
            invalidateWorkflowVersions,
          });
        } else {
          console.error('Autosave failed:', error);
        }
        setAutosaveStatus('error');
        throw error;
      }
    },
    [
      selectedWorkflowId,
      loadedWorkflow,
      saveWorkflowDraft,
      setAutosaveStatus,
      getWorkflow,
      functionBlocksMap,
      setNodes,
      setEdges,
      invalidateWorkflowVersions,
      setLoadedWorkflow,
      setLastRunVersionId,
      resetSavedDataRef,
    ],
  );

  return { autosaveCallback };
}

import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { WorkflowModel } from '@/stores/workflowStore';
import type { InputDef } from '@/types/workflow-spec';
import { toast } from '@/components/ui/sonner';
import { BackendAPIError } from '@/lib/api-client';
import { normalizeNodes, normalizeEdges } from '@/lib/workflow-normalization';
export { handleDraftConflict } from './conflictHandler';

export async function restoreWorkflowVersion(params: {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  versionId: number;
  restoreWorkflowVersion: (id: string, data: { versionId: number; baseRevision: number }) => Promise<WorkflowModel>;
  setLoadedWorkflow: (workflow: WorkflowModel | null) => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setLastRunVersionId: (id: number | null) => void;
  functionBlocksMap: Map<string, unknown>;
  resetSavedDataRef: React.MutableRefObject<(() => void) | undefined>;
  handleDraftConflictFn: () => Promise<void>;
}) {
  if (!params.selectedWorkflowId) {
    toast.error('Select a workflow before restoring a version');
    return;
  }
  if (!params.loadedWorkflow) {
    toast.error('Workflow is still loading. Please try again in a moment.');
    return;
  }

  try {
    const restored = await params.restoreWorkflowVersion(params.selectedWorkflowId, {
      versionId: params.versionId,
      baseRevision: params.loadedWorkflow.draft_revision,
    });
    params.setLoadedWorkflow(restored);
    params.setNodes(normalizeNodes(restored.graph.nodes, params.functionBlocksMap));
    params.setEdges(normalizeEdges(restored.graph.edges));
    params.setLastRunVersionId(null);
    params.resetSavedDataRef.current?.();
    toast.success('Version restored', {
      description: `Draft now matches version ${params.versionId}`,
    });
  } catch (error) {
    console.error('Failed to restore workflow version:', error);
    if (error instanceof BackendAPIError && error.status === 409) {
      await params.handleDraftConflictFn();
      return;
    }
    toast.error('Failed to restore version', {
      description: error instanceof BackendAPIError ? error.message : undefined,
    });
  }
}

export function computeLifecycleStatus(loadedWorkflow: WorkflowModel | null, lastRunVersionId: number | null) {
  if (!loadedWorkflow) return null;

  return {
    draftRevision: loadedWorkflow.draft_revision,
    latestVersion: loadedWorkflow.latest_version ?? null,
    publishedVersion: loadedWorkflow.published_version ?? null,
    lastTestedVersionId: lastRunVersionId,
  };
}

export function computeCapabilities(selectedWorkflowId: string | null, lastRunVersionId: number | null) {
  const canRun = Boolean(selectedWorkflowId);
  const runDisabledReason = canRun ? undefined : 'Save the workflow before testing';
  const canPublish = Boolean(selectedWorkflowId && lastRunVersionId);
  const publishDisabledReason = !selectedWorkflowId
    ? 'Save the workflow before publishing'
    : !lastRunVersionId
      ? 'Run a test to create a publishable version'
      : undefined;

  return { canRun, runDisabledReason, canPublish, publishDisabledReason };
}

export function resolveInputFieldType(inputType: InputDef['type']): string {
  if (inputType === 'number' || inputType === 'integer') {
    return 'number';
  }
  return 'text';
}

export async function saveWorkflow(params: {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  workflowName: string;
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
  createWorkflow: (name: string, description: undefined, graph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => Promise<WorkflowModel>;
  saveWorkflowDraft: (id: string, data: { graph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }; baseRevision: number }) => Promise<WorkflowModel>;
  setSelectedWorkflowId: (id: string) => void;
  setLoadedWorkflow: (workflow: WorkflowModel) => void;
  setWorkflowName: (name: string) => void;
  setLastRunVersionId: (id: number | null) => void;
  handleDraftConflictFn: () => Promise<void>;
}) {
  const graphData = { nodes: params.nodes, edges: params.edges };

  if (params.selectedWorkflowId) {
    if (!params.loadedWorkflow) {
      toast.error('Workflow is still loading. Please try again in a moment.');
      return null;
    }
    const baseRevision = params.loadedWorkflow.draft_revision;
    if (typeof baseRevision !== 'number') {
      toast.error('Missing draft revision for this workflow.');
      return null;
    }

    try {
      const updated = await params.saveWorkflowDraft(params.selectedWorkflowId, {
        graph: graphData,
        baseRevision,
      });
      params.setLoadedWorkflow(updated);
      if (updated.draft_revision !== baseRevision) {
        params.setLastRunVersionId(null);
      }
      toast.success('Draft saved successfully!');
      return updated;
    } catch (error) {
      if (error instanceof BackendAPIError && error.status === 409) {
        await params.handleDraftConflictFn();
        return null;
      }
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
      return null;
    }
  } else {
    try {
      const workflow = await params.createWorkflow(params.workflowName || 'Untitled', undefined, graphData);
      params.setSelectedWorkflowId(workflow.workflow_id);
      params.setLoadedWorkflow(workflow);
      params.setWorkflowName(workflow.name);
      params.setLastRunVersionId(null);
      toast.success('Workflow created and saved!');
      return workflow;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error('Failed to create workflow');
      return null;
    }
  }
}

export async function runWorkflowTest(params: {
  selectedWorkflowId: string | null;
  inputs: Record<string, unknown>;
  executeWorkflow: (id: string, inputs: Record<string, unknown>) => Promise<{ run_id: string; workflow_version_id?: number }>;
  setLastRunVersionId: (id: number | null) => void;
  invalidateWorkflowVersions: () => void;
}) {
  if (!params.selectedWorkflowId) {
    toast.error('Please save the workflow first');
    return false;
  }
  try {
    const response = await params.executeWorkflow(params.selectedWorkflowId, params.inputs);
    params.setLastRunVersionId(response.workflow_version_id ?? null);
    params.invalidateWorkflowVersions();
    toast.success('Test run started', {
      description: `Run ID ${response.run_id}`,
    });
    return true;
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    toast.error('Failed to start test run');
    return false;
  }
}

export async function publishWorkflow(params: {
  selectedWorkflowId: string | null;
  lastRunVersionId: number | null;
  publishWorkflow: (id: string, versionId: number) => Promise<WorkflowModel>;
  setLoadedWorkflow: (workflow: WorkflowModel) => void;
  setLastRunVersionId: (id: number | null) => void;
  invalidateWorkflowVersions: () => void;
}) {
  if (!params.selectedWorkflowId) {
    toast.error('Please save the workflow before publishing');
    return;
  }
  if (!params.lastRunVersionId) {
    toast.error('Run a test to create a publishable version');
    return;
  }
  try {
    const updated = await params.publishWorkflow(params.selectedWorkflowId, params.lastRunVersionId);
    params.setLoadedWorkflow(updated);
    params.setLastRunVersionId(null);
    params.invalidateWorkflowVersions();
    toast.success('Workflow published');
  } catch (error) {
    console.error('Failed to publish workflow:', error);
    toast.error('Failed to publish workflow');
  }
}

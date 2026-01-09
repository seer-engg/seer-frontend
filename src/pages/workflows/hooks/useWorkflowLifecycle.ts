import { useState, useCallback, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { WorkflowModel } from '@/hooks/useWorkflowBuilder';
import type { InputDef } from '@/types/workflow-spec';
import { toast } from '@/components/ui/sonner';
import {
  handleDraftConflict as handleDraftConflictHelper,
  restoreWorkflowVersion as restoreWorkflowVersionHelper,
  computeLifecycleStatus,
  computeCapabilities,
  saveWorkflow as saveWorkflowHelper,
  runWorkflowTest as runWorkflowTestHelper,
  publishWorkflow as publishWorkflowHelper,
} from '../utils/lifecycleHelpers';

export interface UseWorkflowLifecycleParams {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
  workflowName: string;
  workflowInputsDef: Record<string, InputDef>;
  inputFields: Array<{ id: string; variableName: string; required: boolean }>;
  inputData: Record<string, unknown>;
  functionBlocksMap: Map<string, unknown>;
  createWorkflow: (name: string, description: undefined, graph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => Promise<WorkflowModel>;
  saveWorkflowDraft: (id: string, data: { graph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }; baseRevision: number }) => Promise<WorkflowModel>;
  executeWorkflow: (id: string, inputs: Record<string, unknown>) => Promise<{ run_id: string; workflow_version_id?: number }>;
  publishWorkflow: (id: string, versionId: number) => Promise<WorkflowModel>;
  restoreWorkflowVersion: (id: string, data: { versionId: number; baseRevision: number }) => Promise<WorkflowModel>;
  getWorkflow: (id: string) => Promise<WorkflowModel>;
  setSelectedWorkflowId: (id: string | null) => void;
  setLoadedWorkflow: (workflow: WorkflowModel | null) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setInputDialogOpen: (open: boolean) => void;
  setInputData: (data: Record<string, unknown>) => void;
  invalidateWorkflowVersions: () => void;
  resetSavedDataRef: React.MutableRefObject<(() => void) | undefined>;
}

export function useWorkflowLifecycle(params: UseWorkflowLifecycleParams) {
  const { selectedWorkflowId, loadedWorkflow, nodes, edges, workflowName, inputFields, inputData, functionBlocksMap, createWorkflow, saveWorkflowDraft, executeWorkflow, publishWorkflow, restoreWorkflowVersion, getWorkflow, setSelectedWorkflowId, setLoadedWorkflow, setWorkflowName, setNodes, setEdges, setInputDialogOpen, setInputData, invalidateWorkflowVersions, resetSavedDataRef } = params;
  const [lastRunVersionId, setLastRunVersionId] = useState<number | null>(null);
  const handleDraftConflict = useCallback(async () => handleDraftConflictHelper({ selectedWorkflowId, getWorkflow, setLoadedWorkflow, setNodes, setEdges, setLastRunVersionId, functionBlocksMap, invalidateWorkflowVersions, resetSavedDataRef }), [selectedWorkflowId, getWorkflow, setLoadedWorkflow, setNodes, setEdges, functionBlocksMap, invalidateWorkflowVersions, resetSavedDataRef]);
  const handleSave = useCallback(async () => saveWorkflowHelper({ selectedWorkflowId, loadedWorkflow, workflowName, nodes, edges, createWorkflow, saveWorkflowDraft, setSelectedWorkflowId, setLoadedWorkflow, setWorkflowName, setLastRunVersionId, handleDraftConflictFn: handleDraftConflict }), [selectedWorkflowId, loadedWorkflow, workflowName, nodes, edges, createWorkflow, saveWorkflowDraft, setSelectedWorkflowId, setLoadedWorkflow, setWorkflowName, handleDraftConflict]);
  const runWorkflowTest = useCallback(async (inputs?: Record<string, unknown>) => {
    const success = await runWorkflowTestHelper({ selectedWorkflowId, inputs: inputs ?? {}, executeWorkflow, setLastRunVersionId, invalidateWorkflowVersions });
    if (!success) throw new Error('Test run failed');
  }, [selectedWorkflowId, executeWorkflow, invalidateWorkflowVersions]);
  const handleExecute = useCallback(() => {
    if (!selectedWorkflowId) { toast.error('Please save the workflow first'); return; }
    if (inputFields.length > 0) { setInputData({}); setInputDialogOpen(true); return; }
    runWorkflowTest();
  }, [selectedWorkflowId, inputFields, runWorkflowTest, setInputDialogOpen, setInputData]);
  const handleExecuteWithInput = useCallback(async () => {
    if (!selectedWorkflowId) { toast.error('Please save the workflow first'); return; }
    const transformedInputData: Record<string, unknown> = {};
    inputFields.forEach((field) => { transformedInputData[field.variableName] = inputData[field.id]; });
    try { await runWorkflowTest(transformedInputData); setInputDialogOpen(false); setInputData({}); } catch { /* handled */ }
  }, [selectedWorkflowId, inputFields, inputData, runWorkflowTest, setInputDialogOpen, setInputData]);
  const handlePublish = useCallback(async () => publishWorkflowHelper({ selectedWorkflowId, lastRunVersionId, publishWorkflow, setLoadedWorkflow, setLastRunVersionId, invalidateWorkflowVersions }), [selectedWorkflowId, lastRunVersionId, publishWorkflow, setLoadedWorkflow, invalidateWorkflowVersions]);
  const handleRestoreVersion = useCallback(async (versionId: number) => restoreWorkflowVersionHelper({ selectedWorkflowId, loadedWorkflow, versionId, restoreWorkflowVersion, setLoadedWorkflow, setNodes, setEdges, setLastRunVersionId, functionBlocksMap, resetSavedDataRef, handleDraftConflictFn: handleDraftConflict }), [selectedWorkflowId, loadedWorkflow, restoreWorkflowVersion, setLoadedWorkflow, setNodes, setEdges, functionBlocksMap, resetSavedDataRef, handleDraftConflict]);
  const lifecycleStatus = useMemo(() => computeLifecycleStatus(loadedWorkflow, lastRunVersionId), [loadedWorkflow, lastRunVersionId]);
  const { canRun, runDisabledReason, canPublish, publishDisabledReason } = useMemo(() => computeCapabilities(selectedWorkflowId, lastRunVersionId), [selectedWorkflowId, lastRunVersionId]);
  return { handleSave, handleExecute, handleExecuteWithInput, handlePublish, handleRestoreVersion, lifecycleStatus, lastRunVersionId, setLastRunVersionId, canRun, canPublish, runDisabledReason, publishDisabledReason };
}

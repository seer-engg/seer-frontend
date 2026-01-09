import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { WorkflowModel, WorkflowListItem } from '@/stores/workflowStore';
import type { InputDef } from '@/types/workflow-spec';
import { toast } from '@/components/ui/sonner';
import { BackendAPIError } from '@/lib/api-client';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useCanvasStore, useUIStore } from '@/stores';
import { handleDraftConflict } from '../utils/conflictHandler';
import { normalizeNodes, normalizeEdges } from '@/lib/workflow-normalization';
import { useToolsStore } from '@/stores/toolsStore';

/**
 * Consolidated workflow actions hook that combines:
 * - useWorkflowLifecycle (save, execute, publish, restore)
 * - useWorkflowManagement (create, delete, rename, import/export)
 * - useWorkflowAutosave (autosave callback)
 *
 * Phase 3 refactoring: All state is fetched directly from stores,
 * eliminating the need for extensive prop passing.
 */
export function useWorkflowActions() {
  const navigate = useNavigate();

  // Fetch required state from stores - FIXED: Individual selectors instead of useShallow
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const currentWorkflow = useWorkflowStore((state) => state.currentWorkflow);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const setSelectedWorkflowId = useWorkflowStore((state) => state.setSelectedWorkflowId);
  const isLoadingWorkflow = useWorkflowStore((state) => state.isLoadingWorkflow);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const saveWorkflowDraft = useWorkflowStore((state) => state.saveWorkflowDraft);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const publishWorkflow = useWorkflowStore((state) => state.publishWorkflow);
  const restoreWorkflowVersion = useWorkflowStore((state) => state.restoreWorkflowVersion);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const updateWorkflowMetadata = useWorkflowStore((state) => state.updateWorkflowMetadata);
  const exportWorkflow = useWorkflowStore((state) => state.exportWorkflow);
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow);
  const getWorkflow = useWorkflowStore((state) => state.getWorkflow);
  const loadedWorkflow = currentWorkflow;

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const setAutosaveStatus = useCanvasStore((state) => state.setAutosaveStatus);

  const functionBlocksMap = useToolsStore((state) => state.functionBlocksByType);

  const lastRunVersionId = useUIStore((state) => state.lastRunVersionId);
  const setLastRunVersionId = useUIStore((state) => state.setLastRunVersionId);
  const resetSavedDataRef = useRef<(() => void) | undefined>();

  // ==================== LIFECYCLE ACTIONS ====================

  /**
   * Handle draft conflicts when concurrent edits occur
   */
  const handleDraftConflictCallback = useCallback(async () => {
    if (!selectedWorkflowId) return;

    await handleDraftConflict({
      selectedWorkflowId,
      getWorkflow,
      setNodes,
      setEdges,
      functionBlocksMap,
      setLastRunVersionId,
      resetSavedDataRef,
      invalidateWorkflowVersions: () => {}, // This will be handled by caller if needed
    });
  }, [selectedWorkflowId, getWorkflow, setNodes, setEdges, functionBlocksMap]);

  /**
   * Save or create workflow
   */
  const handleSave = useCallback(async () => {
    const graph = { nodes, edges };

    // Create new workflow if none selected
    if (!selectedWorkflowId) {
      try {
        const newWorkflow = await createWorkflow(workflowName || 'Untitled', undefined, graph);
        setSelectedWorkflowId(newWorkflow.workflow_id);
        setWorkflowName(newWorkflow.name);
        setLastRunVersionId(null);
        navigate(`/workflows/${newWorkflow.workflow_id}`, { replace: true });
        toast.success('Workflow created');
      } catch (error) {
        console.error('Failed to create workflow:', error);
        toast.error('Failed to create workflow');
        throw error;
      }
      return;
    }

    // Save existing workflow
    if (!loadedWorkflow || typeof loadedWorkflow.draft_revision !== 'number') {
      toast.error('Workflow is still loading. Please try again in a moment.');
      return;
    }

    try {
      await saveWorkflowDraft(selectedWorkflowId, {
        name: workflowName,
        graph,
        baseRevision: loadedWorkflow.draft_revision,
      });
      setLastRunVersionId(null);
      toast.success('Workflow saved');
    } catch (error) {
      if (error instanceof BackendAPIError && error.status === 409) {
        await handleDraftConflictCallback();
        return;
      }
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
      throw error;
    }
  }, [
    nodes,
    edges,
    selectedWorkflowId,
    workflowName,
    loadedWorkflow,
    createWorkflow,
    saveWorkflowDraft,
    setSelectedWorkflowId,
    setWorkflowName,
    navigate,
    handleDraftConflictCallback,
  ]);

  /**
   * Execute workflow test
   */
  const runWorkflowTest = useCallback(
    async (inputs?: Record<string, unknown>) => {
      if (!selectedWorkflowId) {
        toast.error('Please save the workflow first');
        return false;
      }

      try {
        const result = await executeWorkflow(selectedWorkflowId, inputs ?? {});
        if (result.workflow_version_id) {
          setLastRunVersionId(result.workflow_version_id);
          toast.success('Workflow test started', {
            description: `Run ID: ${result.run_id.slice(0, 8)}...`,
          });
        }
        return true;
      } catch (error) {
        console.error('Failed to execute workflow:', error);
        toast.error('Failed to start workflow test');
        return false;
      }
    },
    [selectedWorkflowId, executeWorkflow],
  );

  /**
   * Execute workflow (opens input dialog if needed)
   */
  const handleExecute = useCallback(
    (inputFields: Array<{ id: string; variableName: string; required: boolean }>) => {
      if (!selectedWorkflowId) {
        toast.error('Please save the workflow first');
        return;
      }

      // If inputs required, caller should open input dialog
      if (inputFields.length > 0) {
        return { needsInput: true };
      }

      void runWorkflowTest();
      return { needsInput: false };
    },
    [selectedWorkflowId, runWorkflowTest],
  );

  /**
   * Execute workflow with provided input data
   */
  const handleExecuteWithInput = useCallback(
    async (
      inputFields: Array<{ id: string; variableName: string; required: boolean }>,
      inputData: Record<string, unknown>,
    ) => {
      if (!selectedWorkflowId) {
        toast.error('Please save the workflow first');
        return;
      }

      const transformedInputData: Record<string, unknown> = {};
      inputFields.forEach((field) => {
        transformedInputData[field.variableName] = inputData[field.id];
      });

      try {
        await runWorkflowTest(transformedInputData);
      } catch (error) {
        // Error already handled by runWorkflowTest
      }
    },
    [selectedWorkflowId, runWorkflowTest],
  );

  /**
   * Publish workflow
   */
  const handlePublish = useCallback(async () => {
    if (!selectedWorkflowId || !lastRunVersionId) {
      toast.error(
        !selectedWorkflowId
          ? 'Save the workflow before publishing'
          : 'Run a test to create a publishable version',
      );
      return;
    }

    try {
      await publishWorkflow(selectedWorkflowId, lastRunVersionId);
      setLastRunVersionId(null);
      toast.success('Workflow published', {
        description: `Version ${lastRunVersionId} is now live`,
      });
    } catch (error) {
      console.error('Failed to publish workflow:', error);
      toast.error('Failed to publish workflow');
      throw error;
    }
  }, [selectedWorkflowId, lastRunVersionId, publishWorkflow]);

  /**
   * Restore workflow version
   */
  const handleRestoreVersion = useCallback(
    async (versionId: number) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        toast.error('Select a workflow before restoring a version');
        return;
      }

      try {
        const restored = await restoreWorkflowVersion(selectedWorkflowId, {
          versionId,
          baseRevision: loadedWorkflow.draft_revision,
        });
        setNodes(normalizeNodes(restored.graph.nodes, functionBlocksMap));
        setEdges(normalizeEdges(restored.graph.edges));
        setLastRunVersionId(null);
        resetSavedDataRef.current?.();
        toast.success('Version restored', {
          description: `Draft now matches version ${versionId}`,
        });
      } catch (error) {
        console.error('Failed to restore workflow version:', error);
        if (error instanceof BackendAPIError && error.status === 409) {
          await handleDraftConflictCallback();
          return;
        }
        toast.error('Failed to restore version', {
          description: error instanceof BackendAPIError ? error.message : undefined,
        });
      }
    },
    [
      selectedWorkflowId,
      loadedWorkflow,
      restoreWorkflowVersion,
      setNodes,
      setEdges,
      functionBlocksMap,
      handleDraftConflictCallback,
    ],
  );

  // ==================== MANAGEMENT ACTIONS ====================

  /**
   * Create new workflow
   */
  const handleNewWorkflow = useCallback(async () => {
    try {
      const workflow = await createWorkflow('Untitled', undefined, { nodes: [], edges: [] });
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
    } catch (error) {
      console.error('Failed to create new workflow:', error);
      toast.error('Failed to create new workflow');
    }
  }, [createWorkflow, navigate]);

  /**
   * Load workflow
   */
  const handleLoadWorkflow = useCallback(
    (workflow: WorkflowListItem) => {
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
    },
    [navigate],
  );

  /**
   * Delete workflow
   */
  const handleDeleteWorkflow = useCallback(
    async (workflowId: string) => {
      if (!confirm('Are you sure you want to delete this workflow?')) return;

      try {
        await deleteWorkflow(workflowId);
        if (selectedWorkflowId === workflowId) {
          navigate('/workflows', { replace: true });
        }
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        toast.error('Failed to delete workflow');
      }
    },
    [deleteWorkflow, selectedWorkflowId, navigate],
  );

  /**
   * Rename workflow
   */
  const handleRenameWorkflow = useCallback(
    async (workflowId: string, newName: string) => {
      if (!newName.trim()) {
        toast.error('Workflow name cannot be empty');
        return;
      }

      try {
        await updateWorkflowMetadata(workflowId, { name: newName.trim() });
        if (selectedWorkflowId === workflowId) {
          setWorkflowName(newName.trim());
        }
        toast.success('Workflow renamed successfully');
      } catch (error) {
        console.error('Failed to rename workflow:', error);
        toast.error('Failed to rename workflow');
        throw error;
      }
    },
    [updateWorkflowMetadata, selectedWorkflowId, setWorkflowName],
  );

  /**
   * Export workflow
   */
  const handleExportWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        await exportWorkflow(workflowId);
        toast.success('Workflow exported successfully');
      } catch (error) {
        console.error('Failed to export workflow:', error);
        toast.error('Failed to export workflow');
      }
    },
    [exportWorkflow],
  );

  /**
   * Import workflow
   */
  const handleImportWorkflow = useCallback(
    async (file: File, options: { name?: string; importTriggers: boolean }) => {
      try {
        const result = await importWorkflow(file, options);
        navigate(`/workflows/${result.workflow_id}`, { replace: true });
        toast.success(`Workflow "${result.name}" imported successfully`);
      } catch (error) {
        console.error('Failed to import workflow:', error);
        if (error instanceof BackendAPIError) {
          toast.error(`Failed to import workflow: ${error.message}`);
        } else {
          toast.error('Failed to import workflow');
        }
        throw error;
      }
    },
    [importWorkflow, navigate],
  );

  // ==================== AUTOSAVE ACTION ====================

  /**
   * Autosave callback for debounced saves
   */
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
        await saveWorkflowDraft(selectedWorkflowId, {
          graph: { nodes: data.nodes, edges: data.edges },
          baseRevision,
        });
        setLastRunVersionId(null);
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (error) {
        if (error instanceof BackendAPIError && error.status === 409) {
          await handleDraftConflict({
            selectedWorkflowId,
            getWorkflow,
            setNodes,
            setEdges,
            functionBlocksMap,
            setLastRunVersionId,
            resetSavedDataRef,
            invalidateWorkflowVersions: () => {},
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
      setNodes,
      setEdges,
      functionBlocksMap,
    ],
  );

  // ==================== COMPUTED STATE ====================

  const lifecycleStatus = useMemo(
    () =>
      loadedWorkflow
        ? {
            draftRevision: loadedWorkflow.draft_revision,
            latestVersion: loadedWorkflow.latest_version ?? null,
            publishedVersion: loadedWorkflow.published_version ?? null,
            lastTestedVersionId: lastRunVersionId,
          }
        : null,
    [loadedWorkflow, lastRunVersionId],
  );

  const capabilities = useMemo(() => {
    const canRun = Boolean(selectedWorkflowId);
    const runDisabledReason = canRun ? undefined : 'Save the workflow before testing';
    const canPublish = Boolean(selectedWorkflowId && lastRunVersionId);
    const publishDisabledReason = !selectedWorkflowId
      ? 'Save the workflow before publishing'
      : !lastRunVersionId
        ? 'Run a test to create a publishable version'
        : undefined;

    return { canRun, runDisabledReason, canPublish, publishDisabledReason };
  }, [selectedWorkflowId, lastRunVersionId]);

  return {
    // Lifecycle actions
    handleSave,
    handleExecute,
    handleExecuteWithInput,
    handlePublish,
    handleRestoreVersion,

    // Management actions
    handleNewWorkflow,
    handleLoadWorkflow,
    handleDeleteWorkflow,
    handleRenameWorkflow,
    handleExportWorkflow,
    handleImportWorkflow,

    // Autosave
    autosaveCallback,

    // State
    lifecycleStatus,
    lastRunVersionId,
    setLastRunVersionId,
    canRun: capabilities.canRun,
    canPublish: capabilities.canPublish,
    runDisabledReason: capabilities.runDisabledReason,
    publishDisabledReason: capabilities.publishDisabledReason,

    // Refs for autosave coordination
    resetSavedDataRef,
  };
}

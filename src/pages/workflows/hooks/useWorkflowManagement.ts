import { useCallback } from 'react';
import type { WorkflowListItem, WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { toast } from '@/components/ui/sonner';
import { BackendAPIError } from '@/lib/api-client';

export interface UseWorkflowManagementParams {
  selectedWorkflowId: string | null;
  loadedWorkflow: WorkflowModel | null;
  deleteWorkflow: (id: string) => Promise<void>;
  updateWorkflowMetadata: (id: string, data: { name: string }) => Promise<void>;
  exportWorkflow: (id: string) => Promise<void>;
  importWorkflow: (file: File, options: { name?: string; importTriggers: boolean }) => Promise<WorkflowModel>;
  createWorkflow: (name: string, description: undefined, graph: { nodes: unknown[]; edges: unknown[] }) => Promise<WorkflowModel>;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setWorkflowName: (name: string) => void;
  setLoadedWorkflow: (workflow: WorkflowModel | ((prev: WorkflowModel | null) => WorkflowModel | null) | null) => void;
}

export function useWorkflowManagement(params: UseWorkflowManagementParams) {
  const {
    selectedWorkflowId,
    loadedWorkflow,
    deleteWorkflow,
    updateWorkflowMetadata,
    exportWorkflow,
    importWorkflow,
    createWorkflow,
    navigate,
    setWorkflowName,
    setLoadedWorkflow,
  } = params;

  const handleNewWorkflow = useCallback(async () => {
    createWorkflow('Untitled', undefined, { nodes: [], edges: [] })
      .then((workflow) => navigate(`/workflows/${workflow.workflow_id}`, { replace: true }))
      .catch((error) => {
        console.error('Failed to create new workflow:', error);
        toast.error('Failed to create new workflow');
      });
  }, [createWorkflow, navigate]);
  const handleLoadWorkflow = useCallback(
    (workflow: WorkflowListItem) => navigate(`/workflows/${workflow.workflow_id}`, { replace: true }),
    [navigate],
  );
  const handleDeleteWorkflow = useCallback(
    async (workflowId: string) => {
      if (!confirm('Are you sure you want to delete this workflow?')) return;

      deleteWorkflow(workflowId)
        .then(() => {
          if (selectedWorkflowId === workflowId) {
            navigate('/workflows', { replace: true });
          }
        })
        .catch((error) => {
          console.error('Failed to delete workflow:', error);
          toast.error('Failed to delete workflow');
        });
    },
    [deleteWorkflow, selectedWorkflowId, navigate],
  );

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
          setLoadedWorkflow((prev) =>
            prev ? { ...prev, name: newName.trim() } : prev,
          );
        }
        toast.success('Workflow renamed successfully');
      } catch (error) {
        console.error('Failed to rename workflow:', error);
        toast.error('Failed to rename workflow');
        throw error;
      }
    },
    [updateWorkflowMetadata, selectedWorkflowId, setWorkflowName, setLoadedWorkflow],
  );

  const handleExportWorkflow = useCallback(
    async (workflowId: string) => {
      exportWorkflow(workflowId)
        .then(() => toast.success('Workflow exported successfully'))
        .catch((error) => {
          console.error('Failed to export workflow:', error);
          toast.error('Failed to export workflow');
        });
    },
    [exportWorkflow],
  );

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

  return { handleNewWorkflow, handleLoadWorkflow, handleDeleteWorkflow, handleRenameWorkflow, handleExportWorkflow, handleImportWorkflow };
}

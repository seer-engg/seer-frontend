import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import {
  useWorkflowStore,
  type WorkflowListItem,
  type WorkflowModel,
} from '@/stores/workflowStore';

export type { WorkflowListItem, WorkflowModel };

export function useWorkflowBuilder() {
  const {
    workflows,
    isLoading,
    isCreating,
    isUpdating,
    isSavingDraft,
    isPublishing,
    isDeleting,
    isRestoringVersion,
    isExecuting,
    selectedNodeId,
    loadWorkflows,
    setSelectedNodeId,
    createWorkflow,
    updateWorkflowMetadata,
    saveWorkflowDraft,
    deleteWorkflow,
    restoreWorkflowVersion,
    executeWorkflow,
    publishWorkflow,
    getWorkflow,
    exportWorkflow,
    importWorkflow,
  } = useWorkflowStore(
    useShallow((state) => ({
      workflows: state.workflows,
      isLoading: state.isLoading,
      isCreating: state.isCreating,
      isUpdating: state.isUpdating,
      isSavingDraft: state.isSavingDraft,
      isPublishing: state.isPublishing,
      isDeleting: state.isDeleting,
      isRestoringVersion: state.isRestoringVersion,
      isExecuting: state.isExecuting,
      selectedNodeId: state.selectedNodeId,
      loadWorkflows: state.loadWorkflows,
      setSelectedNodeId: state.setSelectedNodeId,
      createWorkflow: state.createWorkflow,
      updateWorkflowMetadata: state.updateWorkflowMetadata,
      saveWorkflowDraft: state.saveWorkflowDraft,
      deleteWorkflow: state.deleteWorkflow,
      restoreWorkflowVersion: state.restoreWorkflowVersion,
      executeWorkflow: state.executeWorkflow,
      publishWorkflow: state.publishWorkflow,
      getWorkflow: state.getWorkflow,
      exportWorkflow: state.exportWorkflow,
      importWorkflow: state.importWorkflow,
    })),
  );

  useEffect(() => {
    if (!workflows.length && !isLoading) {
      void loadWorkflows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows.length, isLoading]);

  return {
    workflows,
    isLoading,
    selectedNodeId,
    setSelectedNodeId,
    createWorkflow,
    updateWorkflow: updateWorkflowMetadata,
    updateWorkflowMetadata,
    saveWorkflowDraft,
    deleteWorkflow,
    restoreWorkflowVersion,
    executeWorkflow,
    publishWorkflow,
    getWorkflow,
    isCreating,
    isUpdating,
    isSavingDraft,
    isPublishing,
    isDeleting,
    isExecuting,
    isRestoringVersion,
    exportWorkflow,
    importWorkflow,
  };
}

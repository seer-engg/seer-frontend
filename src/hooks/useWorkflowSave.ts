import { useState, useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useWorkflowActions } from './useWorkflowActions';
import { toast } from '@/components/ui/sonner';

export function useWorkflowSave() {
  const [isSaving, setIsSaving] = useState(false);
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const { handleSave } = useWorkflowActions();

  const saveWorkflow = useCallback(async () => {
    if (!selectedWorkflowId) {
      return;
    }

    setIsSaving(true);
    try {
      await handleSave();
    } catch (error) {
      console.error('Failed to save workflow before OAuth:', error);
      toast.error('Failed to save workflow', {
        description: 'Unable to save workflow before connecting. Please try again.',
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [selectedWorkflowId, handleSave]);

  return {
    saveWorkflow,
    isSaving,
    hasWorkflow: Boolean(selectedWorkflowId),
  };
}

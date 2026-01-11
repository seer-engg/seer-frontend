import { useMemo, useCallback } from 'react';
import type { InputDef } from '@/types/workflow-spec';
import { toast } from '@/components/ui/sonner';
import { backendApiClient } from '@/lib/api-client';
import { normalizeEdges, normalizeNodes } from '@/lib/workflow-normalization';
import { useCanvasStore } from '@/stores';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useToolsStore } from '@/stores/toolsStore';

export function useWorkflowInputs() {
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const loadedWorkflow = useWorkflowStore((state) => state.currentWorkflow);
  const getWorkflow = useWorkflowStore((state) => state.getWorkflow);
  const functionBlocksMap = useToolsStore((state) => state.functionBlocksByType);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);

  const workflowInputsDef = useMemo(
    () => loadedWorkflow?.spec?.inputs ?? {},
    [loadedWorkflow?.spec?.inputs],
  );

  const handleWorkflowInputsChange = useCallback(
    async (nextInputs: Record<string, InputDef>) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        toast.error('Save the workflow before editing inputs');
        return;
      }
      try {
        await backendApiClient.request(`/api/v1/workflows/${selectedWorkflowId}/draft`, {
          method: 'PATCH',
          body: {
            base_revision: loadedWorkflow.draft_revision,
            spec: {
              ...loadedWorkflow.spec,
              inputs: nextInputs,
            },
          },
        });
        const refreshed = await getWorkflow(selectedWorkflowId);
        setNodes(normalizeNodes(refreshed.graph.nodes, functionBlocksMap));
        setEdges(normalizeEdges(refreshed.graph.edges));
      } catch (error) {
        console.error('Failed to update workflow inputs', error);
        toast.error('Unable to update workflow inputs');
        throw error;
      }
    },
    [selectedWorkflowId, loadedWorkflow, getWorkflow, functionBlocksMap, setNodes, setEdges],
  );

  const inputFields = useMemo(() => {
    const resolveHtmlInputType = (inputType: InputDef['type']): string => {
      if (inputType === 'number' || inputType === 'integer') {
        return 'number';
      }
      return 'text';
    };
    return Object.entries(workflowInputsDef).map(([name, def]) => ({
      id: name,
      label: def.description || name,
      type: resolveHtmlInputType(def.type),
      required: def.required !== false,
      variableName: name,
    }));
  }, [workflowInputsDef]);

  return {
    workflowInputsDef,
    handleWorkflowInputsChange,
    inputFields,
  };
}

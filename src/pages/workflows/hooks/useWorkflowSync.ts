import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge, FunctionBlockSchema, WorkflowModel } from '@/components/workflows/types';
import { toast } from '@/components/ui/sonner';
import { normalizeEdges, normalizeNodes } from '@/lib/workflow-normalization';

interface UseWorkflowSyncParams {
  urlWorkflowId: string | undefined;
  loadedWorkflow: WorkflowModel | null;
  functionBlocksMap: Map<string, FunctionBlockSchema>;
  getWorkflow: (id: string) => Promise<WorkflowModel>;
  setSelectedWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setLoadedWorkflow: (workflow: WorkflowModel | null) => void;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setProposalPreview: (preview: unknown) => void;
  setLastRunVersionId: (id: number | null) => void;
  setIsLoadingWorkflow: (loading: boolean) => void;
}

export function useWorkflowSync({
  urlWorkflowId,
  loadedWorkflow,
  functionBlocksMap,
  getWorkflow,
  setSelectedWorkflowId,
  setWorkflowName,
  setLoadedWorkflow,
  setNodes,
  setEdges,
  setProposalPreview,
  setLastRunVersionId,
  setIsLoadingWorkflow,
}: UseWorkflowSyncParams) {
  const navigate = useNavigate();
  const resetSavedDataRef = useRef<(() => void) | null>(null);

  // PHASE 3 FIX: Only depend on workflow ID, not the entire workflow object
  // This prevents infinite loops when getWorkflow updates the store's currentWorkflow
  const loadedWorkflowId = loadedWorkflow?.workflow_id;

  useEffect(() => {
    // If URL has workflowId but loaded workflow doesn't match, load the workflow
    if (urlWorkflowId && urlWorkflowId !== loadedWorkflowId) {
      const loadWorkflowFromUrl = async () => {
        setIsLoadingWorkflow(true);
        try {
          const fullWorkflow = await getWorkflow(urlWorkflowId);
          setSelectedWorkflowId(fullWorkflow.workflow_id);
          setWorkflowName(fullWorkflow.name);
          setLoadedWorkflow(fullWorkflow);
          setNodes(normalizeNodes(fullWorkflow.graph.nodes, functionBlocksMap));
          setEdges(normalizeEdges(fullWorkflow.graph.edges));
          setProposalPreview(null);
          setLastRunVersionId(null);
          resetSavedDataRef.current?.();
        } catch (error) {
          console.error('Failed to load workflow from URL:', error);
          toast.error('Failed to load workflow', {
            description: 'The workflow may not exist or you may not have access to it.',
          });
          // Redirect to /workflows if workflow doesn't exist
          navigate('/workflows', { replace: true });
        } finally {
          setTimeout(() => setIsLoadingWorkflow(false), 100);
        }
      };
      loadWorkflowFromUrl();
    } else if (!urlWorkflowId && loadedWorkflowId) {
      // If URL doesn't have workflowId but we have a loaded workflow, clear the selection
      setSelectedWorkflowId(null);
      setWorkflowName('My Workflow');
      setNodes([]);
      setEdges([]);
      setLoadedWorkflow(null);
      setProposalPreview(null);
      setLastRunVersionId(null);
      resetSavedDataRef.current?.();
    }
  }, [
    urlWorkflowId,
    loadedWorkflowId, // CHANGED: Only depend on ID, not entire object
    getWorkflow,
    functionBlocksMap,
    navigate,
    setNodes,
    setEdges,
    setProposalPreview,
    setSelectedWorkflowId,
    setWorkflowName,
    setLoadedWorkflow,
    setLastRunVersionId,
    setIsLoadingWorkflow,
  ]);

  return { resetSavedDataRef };
}

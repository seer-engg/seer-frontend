/**
 * Block Configuration Page
 * 
 * Full-page view for configuring workflow blocks.
 * Provides unlimited scrolling space for complex block configurations.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { BlockConfigPanel } from '@/components/workflows/BlockConfigPanel';
import { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/sonner';
import { useWorkflowBuilder, WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { workflowSpecToGraph } from '@/lib/workflow-graph';
import type { WorkflowResponse } from '@/types/workflow-spec';

export default function BlockConfiguration() {
  const { workflowId, blockId } = useParams<{ workflowId: string; blockId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateWorkflow } = useWorkflowBuilder();

  const { data: workflow, isLoading, error } = useQuery<WorkflowModel>({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) throw new Error('Workflow ID is required');
      const response = await backendApiClient.request<WorkflowResponse>(
        `/api/v1/workflows/${workflowId}`,
        { method: 'GET' },
      );
      return {
        ...response,
        graph: workflowSpecToGraph(response.spec),
      };
    },
    enabled: !!workflowId,
  });

  // Extract the specific node from workflow graph_data
  const node = useMemo(() => {
    if (!workflow?.graph?.nodes || !blockId) return null;
    return workflow.graph.nodes.find((n) => n.id === blockId) || null;
  }, [workflow, blockId]);

  const allNodes = useMemo(() => {
    return workflow?.graph?.nodes || [];
  }, [workflow]);

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => {
      if (!workflowId) throw new Error('Workflow ID is required');
      return await updateWorkflow(workflowId, {
        graph: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Block configuration saved', {
        description: 'Changes have been saved successfully',
        duration: 2000,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to save configuration', {
        description: error.message || 'An error occurred while saving',
        duration: 3000,
      });
    },
  });

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      if (!workflow?.graph) return;

      const updatedNodes = workflow.graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n,
      );

      updateMutation.mutate({
        nodes: updatedNodes,
        edges: workflow.graph.edges,
      });
    },
    [updateMutation, workflow?.graph],
  );

  const handleBack = () => {
    navigate(`/workflows`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading block configuration...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !workflow) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold mb-2">Workflow Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The workflow you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  // Block not found
  if (!node) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold mb-2">Block Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The block you're looking for doesn't exist in this workflow.
            </p>
          </div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{node.data.label}</h1>
          <p className="text-sm text-muted-foreground">
            {workflow.name} • {node.data.type.replace('_', ' ')} Block
          </p>
        </div>
        {updateMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </header>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          <BlockConfigPanel
            node={node}
            onUpdate={handleNodeUpdate}
            allNodes={allNodes}
            autoSave={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}


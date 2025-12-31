/**
 * Workflow Builder Hook
 * 
 * Manages workflow state, CRUD operations, and execution.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { WorkflowGraphData } from '@/lib/workflow-graph';
import { graphToWorkflowSpec, workflowSpecToGraph } from '@/lib/workflow-graph';
import { backendApiClient } from '@/lib/api-client';
import type {
  RunFromWorkflowRequest,
  RunResponse,
  WorkflowListResponse,
  WorkflowResponse,
  WorkflowSummary,
} from '@/types/workflow-spec';

export interface WorkflowListItem extends WorkflowSummary {}

export interface WorkflowModel extends WorkflowResponse {
  graph: WorkflowGraphData;
}

export function useWorkflowBuilder() {
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await backendApiClient.request<WorkflowListResponse>('/api/v1/workflows', {
        method: 'GET',
      });
      return response.items;
    },
  });

  const getWorkflow = useCallback(
    async (workflowId: string): Promise<WorkflowModel> => {
      return queryClient.fetchQuery({
        queryKey: ['workflow', workflowId],
        queryFn: async () => {
          const response = await backendApiClient.request<WorkflowResponse>(
            `/api/v1/workflows/${workflowId}`,
            { method: 'GET' },
          );
          return {
            ...response,
            graph: workflowSpecToGraph(response.spec),
          };
        },
      });
    },
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      graph: WorkflowGraphData;
    }) => {
      const spec = graphToWorkflowSpec(payload.graph);
      const response = await backendApiClient.request<WorkflowResponse>('/api/v1/workflows', {
        method: 'POST',
        body: {
          name: payload.name,
          description: payload.description,
          spec,
        },
      });
      return {
        ...response,
        graph: workflowSpecToGraph(response.spec),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      workflowId,
      name,
      description,
      graph,
    }: {
      workflowId: string;
      name?: string;
      description?: string;
      graph?: WorkflowGraphData;
    }) => {
      const existing = queryClient.getQueryData<WorkflowModel>(['workflow', workflowId]);
      const spec = graph ? graphToWorkflowSpec(graph, existing?.spec) : undefined;
      const response = await backendApiClient.request<WorkflowResponse>(
        `/api/v1/workflows/${workflowId}`,
        {
          method: 'PUT',
          body: {
            name,
            description,
            spec,
          },
        },
      );
      return {
        ...response,
        graph: workflowSpecToGraph(response.spec),
      };
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.setQueryData(['workflow', workflow.workflow_id], workflow);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      await backendApiClient.request(`/api/v1/workflows/${workflowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async ({
      workflowId,
      inputs,
      config,
    }: {
      workflowId: string;
      inputs?: Record<string, any>;
      config?: Record<string, any>;
    }) => {
      const payload: RunFromWorkflowRequest = {
        inputs: inputs ?? {},
        config: config ?? {},
      };
      return backendApiClient.request<RunResponse>(`/api/v1/workflows/${workflowId}/runs`, {
        method: 'POST',
        body: payload,
      });
    },
  });

  const createWorkflow = useCallback(
    async (name: string, description: string | undefined, graph: WorkflowGraphData) => {
      return createMutation.mutateAsync({
        name,
        description,
        graph,
      });
    },
    [createMutation],
  );

  const updateWorkflow = useCallback(
    async (workflowId: string, updates: { name?: string; description?: string; graph?: WorkflowGraphData }) => {
      return updateMutation.mutateAsync({
        workflowId,
        ...updates,
      });
    },
    [updateMutation],
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      return deleteMutation.mutateAsync(workflowId);
    },
    [deleteMutation],
  );

  const executeWorkflow = useCallback(
    async (workflowId: string, inputs?: Record<string, any>, config?: Record<string, any>) => {
      return executeMutation.mutateAsync({
        workflowId,
        inputs,
        config,
      });
    },
    [executeMutation],
  );

  return {
    workflows: workflowsQuery.data ?? [],
    isLoading: workflowsQuery.isLoading,
    selectedNodeId,
    setSelectedNodeId,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getWorkflow,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
}

/**
 * Workflow Builder Hook
 * 
 * Manages workflow state, CRUD operations, and execution.
 */
import { useState, useCallback, useMemo } from 'react';
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

export type WorkflowListItem = WorkflowSummary;

export interface WorkflowModel extends WorkflowResponse {
  graph: WorkflowGraphData;
}

const toWorkflowModel = (response: WorkflowResponse): WorkflowModel => ({
  ...response,
  graph: workflowSpecToGraph(response.spec),
});

export function useWorkflowBuilder() {
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const workflowListQueryKey = useMemo(() => ['workflows'] as const, []);

  const workflowsQuery = useQuery({
    queryKey: workflowListQueryKey,
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
          return toWorkflowModel(response);
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
      return toWorkflowModel(response);
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowListQueryKey });
      queryClient.setQueryData(['workflow', workflow.workflow_id], workflow);
    },
  });

  const updateMetadataMutation = useMutation({
    mutationFn: async ({
      workflowId,
      name,
      description,
      tags,
    }: {
      workflowId: string;
      name?: string;
      description?: string;
      tags?: string[];
    }) => {
      const response = await backendApiClient.request<WorkflowResponse>(
        `/api/v1/workflows/${workflowId}`,
        {
          method: 'PUT',
          body: {
            name,
            description,
            tags,
          },
        },
      );
      return toWorkflowModel(response);
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowListQueryKey });
      queryClient.setQueryData(['workflow', workflow.workflow_id], workflow);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({
      workflowId,
      graph,
      baseRevision,
    }: {
      workflowId: string;
      graph: WorkflowGraphData;
      baseRevision: number;
    }) => {
      const existing = queryClient.getQueryData<WorkflowModel>(['workflow', workflowId]);
      const spec = graphToWorkflowSpec(graph, existing?.spec);
      const response = await backendApiClient.request<WorkflowResponse>(
        `/api/v1/workflows/${workflowId}/draft`,
        {
          method: 'PATCH',
          body: {
            base_revision: baseRevision,
            spec,
          },
        },
      );
      return toWorkflowModel(response);
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowListQueryKey });
      queryClient.setQueryData(['workflow', workflow.workflow_id], workflow);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ workflowId, versionId }: { workflowId: string; versionId: number }) => {
      const response = await backendApiClient.request<WorkflowResponse>(
        `/api/v1/workflows/${workflowId}/publish`,
        {
          method: 'POST',
          body: {
            version_id: versionId,
          },
        },
      );
      return toWorkflowModel(response);
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowListQueryKey });
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
      queryClient.invalidateQueries({ queryKey: workflowListQueryKey });
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

  const updateWorkflowMetadata = useCallback(
    async (workflowId: string, updates: { name?: string; description?: string; tags?: string[] }) => {
      return updateMetadataMutation.mutateAsync({
        workflowId,
        ...updates,
      });
    },
    [updateMetadataMutation],
  );

  const saveWorkflowDraft = useCallback(
    async (workflowId: string, params: { graph: WorkflowGraphData; baseRevision: number }) => {
      return saveDraftMutation.mutateAsync({
        workflowId,
        ...params,
      });
    },
    [saveDraftMutation],
  );

  const publishWorkflow = useCallback(
    async (workflowId: string, versionId: number) => {
      return publishMutation.mutateAsync({
        workflowId,
        versionId,
      });
    },
    [publishMutation],
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
    updateWorkflow: updateWorkflowMetadata,
    updateWorkflowMetadata,
    saveWorkflowDraft,
    deleteWorkflow,
    executeWorkflow,
    publishWorkflow,
    getWorkflow,
    isCreating: createMutation.isPending,
    isUpdating: updateMetadataMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
}

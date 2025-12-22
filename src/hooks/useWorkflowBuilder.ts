/**
 * Workflow Builder Hook
 * 
 * Manages workflow state, CRUD operations, and execution.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Node, Edge } from '@xyflow/react';
import { backendApiClient, getBackendBaseUrl } from '@/lib/api-client';
import { WorkflowNodeData } from '@/components/workflows/WorkflowCanvas';

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  graph_data: {
    nodes: Node<WorkflowNodeData>[];
    edges: Edge[];
  };
  schema_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: number;
  workflow_id: number;
  status: 'running' | 'completed' | 'failed';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export function useWorkflowBuilder() {
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // List workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ workflows: Workflow[] }>(
        '/workflows',
        { method: 'GET' }
      );
      return response.workflows;
    },
  });

  // Create workflow
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; graph_data: any }) => {
      return await backendApiClient.request<Workflow>('/workflows', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  // Update workflow
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Workflow>;
    }) => {
      return await backendApiClient.request<Workflow>(`/workflows/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  // Delete workflow
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await backendApiClient.request(`/workflows/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  // Execute workflow
  const executeMutation = useMutation({
    mutationFn: async ({
      workflowId,
      inputData,
      stream = false,
    }: {
      workflowId: number;
      inputData?: Record<string, any>;
      stream?: boolean;
    }) => {
      const endpoint = stream
        ? `/workflows/${workflowId}/execute/stream`
        : `/workflows/${workflowId}/execute`;
      
      if (stream) {
        // Handle streaming execution - use dynamic backend URL
        const baseUrl = getBackendBaseUrl();
        const response = await fetch(
          `${baseUrl}${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${await getAuthToken()}`,
            },
            body: JSON.stringify({ input_data: inputData, stream: true }),
          }
        );
        return response;
      } else {
        return await backendApiClient.request<WorkflowExecution>(endpoint, {
          method: 'POST',
          body: { input_data: inputData, stream: false },
        });
      }
    },
  });

  // Get executions
  const getExecutions = useCallback(
    async (workflowId: number) => {
      const response = await backendApiClient.request<WorkflowExecution[]>(
        `/workflows/${workflowId}/executions`,
        { method: 'GET' }
      );
      return response;
    },
    []
  );

  const createWorkflow = useCallback(
    async (name: string, description?: string, graphData?: any) => {
      return createMutation.mutateAsync({
        name,
        description,
        graph_data: graphData || { nodes: [], edges: [] },
      });
    },
    [createMutation]
  );

  const updateWorkflow = useCallback(
    async (id: number, updates: Partial<Workflow>) => {
      return updateMutation.mutateAsync({ id, data: updates });
    },
    [updateMutation]
  );

  const deleteWorkflow = useCallback(
    async (id: number) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const executeWorkflow = useCallback(
    async (
      workflowId: number,
      inputData?: Record<string, any>,
      stream = false
    ) => {
      return executeMutation.mutateAsync({
        workflowId,
        inputData,
        stream,
      });
    },
    [executeMutation]
  );

  return {
    workflows: workflows || [],
    isLoading,
    selectedNodeId,
    setSelectedNodeId,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getExecutions,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const clerk = (window as any).Clerk;
  if (!clerk?.session?.getToken) return null;
  try {
    return await clerk.session.getToken({ template: 'user-profile' });
  } catch {
    return null;
  }
}


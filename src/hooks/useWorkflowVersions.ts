import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';
import type { WorkflowVersionListResponse } from '@/types/workflow-spec';

export function useWorkflowVersions(workflowId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['workflowVersions', workflowId] as const, [workflowId]);

  const versionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workflowId) {
        throw new Error('workflowId is required to load versions');
      }
      return backendApiClient.request<WorkflowVersionListResponse>(
        `/api/v1/workflows/${workflowId}/versions`,
        { method: 'GET' },
      );
    },
    enabled: Boolean(workflowId),
  });

  const invalidate = useCallback(() => {
    if (!workflowId) {
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, workflowId]);

  return {
    versionsResponse: versionsQuery.data,
    versions: versionsQuery.data?.versions ?? [],
    draftRevision: versionsQuery.data?.draft_revision ?? null,
    latestVersionId: versionsQuery.data?.latest_version_id ?? null,
    publishedVersionId: versionsQuery.data?.published_version_id ?? null,
    isLoading: versionsQuery.isLoading,
    isFetching: versionsQuery.isFetching,
    refetch: versionsQuery.refetch,
    invalidate,
  };
}



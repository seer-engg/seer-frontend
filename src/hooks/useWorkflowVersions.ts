import { useCallback, useEffect } from 'react';

import { useWorkflowStore } from '@/stores/workflowStore';

export function useWorkflowVersions(workflowId: string | null) {
  // FIXED: Individual selectors instead of useShallow
  const workflowVersions = useWorkflowStore((state) => state.workflowVersions);
  const loadWorkflowVersions = useWorkflowStore((state) => state.loadWorkflowVersions);
  const invalidateWorkflowVersions = useWorkflowStore((state) => state.invalidateWorkflowVersions);

  const versionState = workflowId ? workflowVersions[workflowId] : undefined;
  const versionsResponse = versionState?.response ?? null;
  const isLoading = Boolean(workflowId && versionState?.isLoading);

  useEffect(() => {
    if (!workflowId) {
      return;
    }
    if (!versionState || (!versionState.response && !versionState.isLoading)) {
      void loadWorkflowVersions(workflowId).catch(() => undefined);
    }
  }, [workflowId, versionState, loadWorkflowVersions]);

  const refetch = useCallback(() => {
    if (!workflowId) {
      return Promise.resolve(undefined);
    }
    return loadWorkflowVersions(workflowId);
  }, [workflowId, loadWorkflowVersions]);

  const invalidate = useCallback(() => {
    if (workflowId) {
      invalidateWorkflowVersions(workflowId);
    }
  }, [workflowId, invalidateWorkflowVersions]);

  return {
    versionsResponse,
    versions: versionsResponse?.versions ?? [],
    draftRevision: versionsResponse?.draft_revision ?? null,
    latestVersionId: versionsResponse?.latest_version_id ?? null,
    publishedVersionId: versionsResponse?.published_version_id ?? null,
    isLoading,
    isFetching: isLoading,
    refetch,
    invalidate,
  };
}

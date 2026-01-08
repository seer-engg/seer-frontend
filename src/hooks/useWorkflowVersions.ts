import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { useWorkflowStore } from '@/stores/workflowStore';

export function useWorkflowVersions(workflowId: string | null) {
  const {
    workflowVersions,
    loadWorkflowVersions,
    invalidateWorkflowVersions,
  } = useWorkflowStore(
    useShallow((state) => ({
      workflowVersions: state.workflowVersions,
      loadWorkflowVersions: state.loadWorkflowVersions,
      invalidateWorkflowVersions: state.invalidateWorkflowVersions,
    })),
  );

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

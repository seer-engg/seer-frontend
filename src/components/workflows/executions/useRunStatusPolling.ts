import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';

import type {
  RunStatus,
  RunStatusResponse,
  WorkflowRunListResponse,
  WorkflowRunSummary,
} from './types';

const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running'];

interface UseRunStatusPollingOptions {
  workflowId?: string | null;
  runs: WorkflowRunSummary[];
  intervalMs?: number;
}

export function useRunStatusPolling({
  workflowId,
  runs,
  intervalMs = 3000,
}: UseRunStatusPollingOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    const activeRunIds = runs
      .filter((run) => ACTIVE_STATUSES.includes(run.status))
      .map((run) => run.run_id);

    if (activeRunIds.length === 0) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const pollOnce = async () => {
      try {
        const responses = await Promise.all(
          activeRunIds.map((runId) =>
            backendApiClient.request<RunStatusResponse>(`/api/v1/runs/${runId}`, {
              method: 'GET',
            })
          )
        );

        if (cancelled || responses.length === 0) {
          return;
        }

        const updates = new Map(responses.map((run) => [run.run_id, run]));

        queryClient.setQueryData<WorkflowRunListResponse | undefined>(
          ['workflow-runs', workflowId],
          (previous) => {
            if (!previous) {
              return previous;
            }

            const nextRuns = previous.runs.map((run) => {
              const latest = updates.get(run.run_id);
              if (!latest) {
                return run;
              }

              return {
                ...run,
                status: latest.status,
                started_at: latest.started_at ?? run.started_at,
                finished_at: latest.finished_at ?? run.finished_at,
                error: latest.last_error ?? run.error,
              };
            });

            return {
              ...previous,
              runs: nextRuns,
            };
          }
        );
      } catch (error) {
        console.error('Failed to poll run status', error);
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(pollOnce, intervalMs);
        }
      }
    };

    pollOnce();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [workflowId, runs, intervalMs, queryClient]);
}


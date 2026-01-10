import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { backendApiClient } from '@/lib/api-client';
import { ExecutionTraceHeader } from '@/components/workflows/executions/ExecutionTraceHeader';
import { TraceOverview } from '@/components/workflows/executions/TraceOverview';
import { WaterfallTimeline } from '@/components/workflows/executions/WaterfallTimeline';
import type { RunHistoryResponse, RunHistoryEntry } from '@/components/workflows/executions/types';

interface LocationState {
  workflowId?: string | null;
  workflowName?: string | null;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <p className="text-sm">Failed to load execution trace</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-muted-foreground">No trace data available</p>
    </div>
  );
}

function TraceContent({ entry }: { entry: RunHistoryEntry }) {
  return (
    <>
      <TraceOverview entry={entry} />
      <Separator />
      {entry.nodes && entry.nodes.length > 0 && (
        <WaterfallTimeline
          nodes={entry.nodes}
          startTime={entry.started_at}
          endTime={entry.finished_at}
        />
      )}
    </>
  );
}

export function ExecutionTrace() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const workflowId = state?.workflowId;
  const workflowName = state?.workflowName;

  const { data, isLoading, error, refetch } = useQuery<RunHistoryResponse>({
    queryKey: ['run-history', runId],
    queryFn: async () => {
      return backendApiClient.request<RunHistoryResponse>(
        `/api/v1/runs/${runId}/history`,
        { method: 'GET' }
      );
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const response = query.state.data;
      const entry = response?.history?.[0];
      return entry?.status === 'running' || entry?.status === 'queued' ? 3000 : false;
    },
  });

  const entry = data?.history?.[0];

  return (
    <div className="flex flex-col h-screen bg-background">
      <ExecutionTraceHeader
        runId={runId || ''}
        workflowId={workflowId}
        workflowName={workflowName}
        onBack={() => navigate(-1)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {isLoading && <LoadingState />}
          {error && <ErrorState onRetry={refetch} />}
          {!isLoading && !error && !entry && <EmptyState />}
          {!isLoading && !error && entry && <TraceContent entry={entry} />}
        </div>
      </main>
    </div>
  );
}

/**
 * ExecutionsPanel - List of workflow executions for the sidebar
 */
import { useQuery } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Loader2, Clock, AlertCircle, Play, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { backendApiClient } from '@/lib/api-client';

import { useRunStatusPolling } from './useRunStatusPolling';
import type { RunStatus, WorkflowRunListResponse, WorkflowRunSummary } from './types';

interface ExecutionsPanelProps {
  workflowId: string | null;
}

function getStatusIcon(status: RunStatus) {
  switch (status) {
    case 'succeeded':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'cancelled':
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    case 'queued':
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: RunStatus) {
  const variants: Record<RunStatus, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    succeeded: 'default',
    failed: 'destructive',
    running: 'secondary',
    queued: 'secondary',
    cancelled: 'outline',
  };

  return (
    <Badge variant={variants[status]} className="text-xs">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function calculateDuration(startedAt?: string | null, finishedAt?: string | null): string | null {
  if (!startedAt || !finishedAt) return null;
  const seconds = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function ExecutionsPanel({ workflowId }: ExecutionsPanelProps) {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<WorkflowRunListResponse>({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async () => {
      return backendApiClient.request<WorkflowRunListResponse>(
        `/api/v1/workflows/${workflowId}/runs`,
        { method: 'GET' }
      );
    },
    enabled: !!workflowId,
    refetchInterval: (
      query: Query<WorkflowRunListResponse, Error, WorkflowRunListResponse, readonly unknown[]>
    ) => {
      const response = query.state.data;
      // Poll if any run is still running
      const hasRunning = response?.runs?.some(
        (run) => run.status === 'running' || run.status === 'queued'
      );
      return hasRunning ? 3000 : false;
    },
  });

  const runs: WorkflowRunSummary[] = data?.runs ?? [];

  useRunStatusPolling({
    workflowId,
    runs,
  });

  if (!workflowId) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-border flex items-center px-4 bg-card shrink-0">
          <h3 className="text-sm font-medium">Executions</h3>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <p className="text-sm">Select a workflow to view executions</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-border flex items-center px-4 bg-card shrink-0">
          <h3 className="text-sm font-medium">Executions</h3>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-border flex items-center px-4 bg-card shrink-0">
          <h3 className="text-sm font-medium">Executions</h3>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <p className="text-sm">Failed to load executions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <h3 className="text-sm font-medium">Executions</h3>
        <span className="text-xs text-muted-foreground">{runs.length} runs</span>
      </div>

      {runs.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-3 p-6">
            <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No executions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run this workflow to see execution history
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {runs.map((run) => {
              const duration = calculateDuration(run.started_at, run.finished_at);
              return (
                <button
                  key={run.run_id}
                  onClick={() => navigate(`/workflows/${workflowId}/traces/${run.run_id}`)}
                  className="w-full text-left p-3 rounded-md border bg-card hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(run.status)}
                      {getStatusBadge(run.status)}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {run.run_id}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(run.created_at), 'MMM d, h:mm a')}</span>
                      {duration && (
                        <>
                          <span>•</span>
                          <span>{duration}</span>
                        </>
                      )}
                    </div>
                    {run.error && (
                      <p className="text-xs text-destructive line-clamp-1">
                        {run.error}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

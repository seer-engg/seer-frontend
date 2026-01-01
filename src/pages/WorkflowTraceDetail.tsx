/**
 * Workflow Trace Detail Page
 * 
 * Full-page view for single workflow execution trace with detailed trace viewer
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { WorkflowTraceViewer, WorkflowNodeTrace } from '@/components/workflow/WorkflowTraceViewer';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

interface Workflow {
  id: number;
  name: string;
}

interface RunHistoryEntry {
  run_id: string;
  workflow_id: string | null;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  nodes: WorkflowNodeTrace[];
  execution_graph?: {
    nodes: Array<{ id: string; type: string; label: string }>;
    edges: Array<{ source: string; target: string }>;
  };
}

interface RunHistoryResponse {
  run_id: string;
  history: RunHistoryEntry[];
}

export default function WorkflowTraceDetail() {
  const { workflowId, runId } = useParams<{ workflowId: string; runId: string }>();
  const navigate = useNavigate();

  // Fetch workflow details
  const { data: workflow } = useQuery<Workflow>({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Workflow>(
        `/api/v1/workflows/${workflowId}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!workflowId,
  });

  // Fetch run history
  const {
    data: historyResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<RunHistoryResponse>({
    queryKey: ['run-history', runId],
    queryFn: async () => {
      return backendApiClient.request<RunHistoryResponse>(
        `/api/v1/runs/${runId}/history`,
        { method: 'GET' }
      );
    },
    enabled: !!runId,
    refetchInterval: (data) => {
      // Poll if run is still running
      const entry = data?.history?.[0];
      if (entry && (entry.status === 'running' || entry.status === 'queued')) {
        return 5000;
      }
      return false;
    },
  });

  const historyEntry = historyResponse?.history?.[0];
  const historyError =
    isError && error
      ? error instanceof Error
        ? error.message
        : 'Unable to load trace history'
      : null;

  const handleBack = () => {
    if (workflowId) {
      navigate(`/workflows/${workflowId}/traces`);
    } else {
      navigate('/workflows');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          title="Back to traces"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {workflow?.name || 'Workflow Trace'}
          </h1>
          <p className="text-sm text-muted-foreground">Run: {runId}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading trace history...</p>
            </div>
          </div>
        ) : historyError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load trace history</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">{historyError}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : !historyEntry ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No trace data found</h3>
                <p className="text-sm text-muted-foreground">
                  Trace history is not available for this run.
                </p>
              </div>
              <Button onClick={handleBack} variant="outline">
                Back to Traces
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <WorkflowTraceViewer
              runId={runId!}
              workflowId={historyEntry.workflow_id || workflowId || ''}
              nodes={historyEntry.nodes || []}
              status={historyEntry.status as RunStatus}
              createdAt={historyEntry.created_at}
              startedAt={historyEntry.started_at}
              finishedAt={historyEntry.finished_at}
            />
          </div>
        )}
      </div>
    </div>
  );
}


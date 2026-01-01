/**
 * Agent Trace Detail Page
 * 
 * Full-page view for single agent conversation trace
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { AgentTraceViewer, AgentMessage } from '@/components/agent/AgentTraceViewer';

interface AgentTraceDetail {
  thread_id: string;
  workflow_id?: string | null;
  workflow_name?: string | null;
  created_at: string;
  updated_at: string;
  title?: string | null;
  messages: AgentMessage[];
}

export default function AgentTraceDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  // Fetch agent trace detail
  const {
    data: traceDetail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AgentTraceDetail>({
    queryKey: ['agent-trace', threadId],
    queryFn: async () => {
      return backendApiClient.request<AgentTraceDetail>(
        `/api/agents/traces/${threadId}`,
        { method: 'GET' }
      );
    },
    enabled: !!threadId,
  });

  const traceError =
    isError && error
      ? error instanceof Error
        ? error.message
        : 'Unable to load agent trace'
      : null;

  const handleBack = () => {
    navigate('/agents/traces');
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
            {traceDetail?.title || 'Agent Trace'}
          </h1>
          <p className="text-sm text-muted-foreground">Thread: {threadId}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading trace...</p>
            </div>
          </div>
        ) : traceError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load trace</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">{traceError}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : !traceDetail ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Trace not found</h3>
                <p className="text-sm text-muted-foreground">
                  The requested agent trace could not be found.
                </p>
              </div>
              <Button onClick={handleBack} variant="outline">
                Back to Traces
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <AgentTraceViewer
              threadId={traceDetail.thread_id}
              workflowId={traceDetail.workflow_id}
              workflowName={traceDetail.workflow_name}
              createdAt={traceDetail.created_at}
              updatedAt={traceDetail.updated_at}
              title={traceDetail.title}
              messages={traceDetail.messages}
            />
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Execution Panel Component
 * 
 * Displays workflow execution history and status.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';

interface ExecutionPanelProps {
  workflowId: number;
}

interface Execution {
  id: number;
  status: 'running' | 'completed' | 'failed';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export function ExecutionPanel({ workflowId }: ExecutionPanelProps) {
  const { data: executions, isLoading, refetch } = useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Execution[]>(
        `/workflows/${workflowId}/executions`,
        { method: 'GET' }
      );
      return response;
    },
    refetchInterval: 5000, // Poll every 5 seconds for running executions
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Loading executions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
        <CardDescription>
          View past and current workflow executions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {executions && executions.length > 0 ? (
              executions.map((execution) => (
                <Card key={execution.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className="font-medium">Execution #{execution.id}</span>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Started: {format(new Date(execution.started_at), 'PPp')}
                    </div>
                    {execution.completed_at && (
                      <div>
                        Completed: {format(new Date(execution.completed_at), 'PPp')}
                      </div>
                    )}
                  </div>

                  {execution.error_message && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                      {execution.error_message}
                    </div>
                  )}

                  {execution.output_data && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-muted-foreground">
                        View Output
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(execution.output_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No executions yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


/**
 * Workflow Execution Page
 * 
 * Dedicated full-page view for workflow execution details, logs, and history.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, Play, FileInput, FileOutput, AlertCircle } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import JsonView from '@uiw/react-json-view';

interface Execution {
  id: number;
  status: 'running' | 'completed' | 'failed';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface Workflow {
  id: number;
  name: string;
}

function getStatusIcon(status: Execution['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: Execution['status']) {
  const variants: Record<Execution['status'], 'default' | 'destructive' | 'secondary'> = {
    completed: 'default',
    failed: 'destructive',
    running: 'secondary',
  };
  
  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function WorkflowExecution() {
  const { executionId, workflowId } = useParams<{ executionId?: string; workflowId: string }>();
  const navigate = useNavigate();
  
  // Fetch workflow details
  const { data: workflow } = useQuery<Workflow>({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Workflow>(
        `/api/workflows/${workflowId}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!workflowId,
  });
  
  // Fetch all executions for this workflow
  const { data: executions } = useQuery<Execution[]>({
    queryKey: ['executions', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Execution[]>(
        `/api/workflows/${workflowId}/executions`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!workflowId,
    refetchInterval: 5000, // Poll every 5 seconds for running executions
  });
  
  // Auto-select most recent execution if none selected
  useEffect(() => {
    if (!executionId && executions && executions.length > 0) {
      const mostRecent = executions[0]; // Assuming they're sorted by most recent first
      navigate(`/workflows/${workflowId}/execution/${mostRecent.id}`, { replace: true });
    }
  }, [executionId, executions, workflowId, navigate]);
  
  // Determine which execution to show
  const selectedExecutionId = executionId || (executions && executions.length > 0 ? executions[0].id : null);
  
  // Fetch specific execution
  const { data: execution } = useQuery<Execution>({
    queryKey: ['execution', selectedExecutionId],
    queryFn: async () => {
      const response = await backendApiClient.request<Execution>(
        `/api/workflows/${workflowId}/executions/${selectedExecutionId}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!selectedExecutionId && !!workflowId,
    refetchInterval: (data) => {
      // Poll if execution is running
      return data?.status === 'running' ? 2000 : false;
    },
  });
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!executions) return null;
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const running = executions.filter(e => e.status === 'running').length;
    return { total, completed, failed, running, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [executions]);
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/workflows`)}
          title="Back to workflows"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {workflow?.name || 'Workflow Execution'}
          </h1>
          {execution && (
            <p className="text-sm text-muted-foreground">
              Execution #{execution.id}
            </p>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left: Execution Details */}
        <ResizablePanel defaultSize={70} minSize={50} maxSize={85} className="min-w-0">
          <div className="flex flex-col h-full border-r border-border overflow-hidden">
          {execution ? (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-full">
                {/* Execution Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <h2 className="text-2xl font-bold">Execution #{execution.id}</h2>
                      {getStatusBadge(execution.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground ml-0 md:ml-8">
                      <span>Started: {format(new Date(execution.started_at), 'PPp')}</span>
                      {execution.completed_at && (
                        <>
                          <span className="hidden md:inline">•</span>
                          <span>Completed: {format(new Date(execution.completed_at), 'PPp')}</span>
                          <span className="hidden md:inline">•</span>
                          <span>
                            Duration: {Math.round(
                              (new Date(execution.completed_at).getTime() - 
                               new Date(execution.started_at).getTime()) / 1000
                            )}s
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tabs for Input/Output/Error */}
                <Tabs defaultValue={execution.error_message ? "error" : "output"} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="input" className="flex items-center gap-2">
                      <FileInput className="w-4 h-4" />
                      Input
                    </TabsTrigger>
                    <TabsTrigger value="output" className="flex items-center gap-2">
                      <FileOutput className="w-4 h-4" />
                      Output
                    </TabsTrigger>
                    {execution.error_message && (
                      <TabsTrigger value="error" className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Error
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="input" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Input Data</CardTitle>
                        <CardDescription>
                          Input parameters passed to this workflow execution
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        {execution.input_data && Object.keys(execution.input_data).length > 0 ? (
                          <div className="w-full max-w-full overflow-hidden text-left">
                            <ScrollArea className="max-h-[600px] w-full">
                              <JsonView
                                value={execution.input_data}
                                collapsed={false}
                                style={{
                                  '--w-rjv-background-color': 'hsl(var(--background))',
                                  '--w-rjv-color': 'hsl(var(--foreground))',
                                  '--w-rjv-key-string': 'hsl(var(--primary))',
                                  '--w-rjv-type-string-color': 'hsl(var(--muted-foreground))',
                                  '--w-rjv-type-int-color': 'hsl(var(--muted-foreground))',
                                  '--w-rjv-type-boolean-color': 'hsl(var(--muted-foreground))',
                                }}
                              />
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-8 text-center">
                            No input data provided
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="output" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Output Data</CardTitle>
                        <CardDescription>
                          Results returned from this workflow execution
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        {execution.output_data && Object.keys(execution.output_data).length > 0 ? (
                          <div className="w-full max-w-full overflow-hidden text-left">
                            <ScrollArea className="max-h-[600px] w-full">
                              <JsonView
                                value={execution.output_data}
                                collapsed={false}
                                style={{
                                  '--w-rjv-background-color': 'hsl(var(--background))',
                                  '--w-rjv-color': 'hsl(var(--foreground))',
                                  '--w-rjv-key-string': 'hsl(var(--primary))',
                                  '--w-rjv-type-string-color': 'hsl(var(--muted-foreground))',
                                  '--w-rjv-type-int-color': 'hsl(var(--muted-foreground))',
                                  '--w-rjv-type-boolean-color': 'hsl(var(--muted-foreground))',
                                }}
                              />
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-8 text-center">
                            {execution.status === 'running' 
                              ? 'Execution in progress...' 
                              : 'No output data available'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {execution.error_message && (
                    <TabsContent value="error" className="mt-4">
                      <Card className="border-destructive/50">
                        <CardHeader>
                          <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Error Details
                          </CardTitle>
                          <CardDescription>
                            This execution failed with the following error
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="max-h-[600px] w-full">
                            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 w-full">
                              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-words overflow-x-auto">
                                {execution.error_message}
                              </pre>
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </ScrollArea>
          ) : executions && executions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No executions yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Execute this workflow to see execution history and results here.
                  </p>
                </div>
                {workflowId && (
                  <Button
                    onClick={() => navigate(`/workflows`)}
                    variant="outline"
                  >
                    Go to Workflow Editor
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading execution...</p>
              </div>
            </div>
          )}
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Right: Execution History & Controls */}
        <ResizablePanel defaultSize={30} minSize={15} maxSize={50} className="min-w-0">
          <div className="flex flex-col h-full border-l border-border bg-card overflow-hidden">
          {/* Stats Summary */}
          {stats && stats.total > 0 && (
            <div className="p-4 border-b bg-muted/30">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{stats.total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Success Rate</div>
                  <div className="text-lg font-semibold">{stats.successRate}%</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Execution History */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b">
              <h2 className="text-sm font-semibold">Execution History</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {executions?.length || 0} execution{executions?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {executions && executions.length > 0 ? (
                  executions.map((exec) => (
                    <Card
                      key={exec.id}
                      className={`cursor-pointer transition-all ${
                        exec.id === execution?.id 
                          ? 'ring-2 ring-primary bg-accent/50' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => navigate(`/workflows/${workflowId}/execution/${exec.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex-shrink-0">
                              {getStatusIcon(exec.status)}
                            </div>
                            <span className="font-medium text-sm">#{exec.id}</span>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(exec.status)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div className="truncate">
                            {format(new Date(exec.started_at), 'MMM d, h:mm a')}
                          </div>
                          {exec.completed_at && (
                            <div>
                              {Math.round(
                                (new Date(exec.completed_at).getTime() - 
                                 new Date(exec.started_at).getTime()) / 1000
                              )}s
                            </div>
                          )}
                        </div>
                        {exec.error_message && (
                          <div className="mt-2 text-xs text-destructive line-clamp-1 truncate">
                            {exec.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No executions yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}


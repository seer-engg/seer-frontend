/**
 * Workflow Execution Page
 * 
 * Dedicated full-page view for workflow execution details, logs, and history.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  ExpandedState,
} from '@tanstack/react-table';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, Play, FileInput, FileOutput, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { JsonViewer } from '@textea/json-viewer';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

interface WorkflowRunSummary {
  run_id: string;
  status: RunStatus;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  inputs?: Record<string, any> | null;
  output?: Record<string, any> | null;
  error?: string | null;
}

interface WorkflowRunListResponse {
  workflow_id: string;
  runs: WorkflowRunSummary[];
}

interface RunHistoryResponse {
  run_id: string;
  history: Record<string, any>[];
}

interface Workflow {
  id: number;
  name: string;
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
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function calculateDuration(startedAt?: string | null, completedAt?: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  return Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
}

export default function WorkflowExecution() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<ExpandedState>({});
  
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
  
  // Fetch all runs for this workflow
  const { data: runListResponse, isLoading } = useQuery<WorkflowRunListResponse>({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<WorkflowRunListResponse>(
        `/api/v1/workflows/${workflowId}/runs`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!workflowId,
    refetchInterval: 5000, // Poll frequently to keep statuses fresh
  });

  const runs = runListResponse?.runs ?? [];
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!runs.length) return null;
    const total = runs.length;
    const completed = runs.filter(run => run.status === 'succeeded').length;
    return { total, completed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [runs]);

  // Define table columns
  const columns = useMemo<ColumnDef<WorkflowRunSummary>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => row.toggleExpanded()}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'run_id',
      header: 'Run ID',
      cell: ({ row }) => {
        return <span className="font-medium">{row.getValue('run_id')}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as RunStatus;
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            {getStatusBadge(status)}
          </div>
        );
      },
    },
    {
      accessorKey: 'started_at',
      header: 'Started',
      cell: ({ row }) => {
        const startedAt = row.getValue('started_at') as string | undefined | null;
        return (
          <span className="text-sm">
            {startedAt ? format(new Date(startedAt), 'MMM d, yyyy h:mm a') : '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'finished_at',
      header: 'Completed',
      cell: ({ row }) => {
        const completedAt = row.original.finished_at;
        return (
          <span className="text-sm">
            {completedAt ? format(new Date(completedAt), 'MMM d, yyyy h:mm a') : '-'}
          </span>
        );
      },
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration = calculateDuration(row.original.started_at, row.original.finished_at);
        return (
          <span className="text-sm">
            {duration !== null ? `${duration}s` : '-'}
          </span>
        );
      },
    },
    {
      id: 'error',
      header: 'Error',
      cell: ({ row }) => {
        const errorMessage = row.original.error;
        if (!errorMessage) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <span className="text-sm text-destructive line-clamp-1 max-w-[300px]" title={errorMessage}>
            {errorMessage}
          </span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: runs,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

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
        </div>
        {stats && stats.total > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Success Rate: </span>
              <span className="font-semibold">{stats.successRate}%</span>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading executions...</p>
            </div>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
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
          <div className="h-full overflow-auto p-6 bg-white">
            <div className="w-full max-w-full overflow-x-auto bg-white">
              <Table className="bg-white">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-white">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} className="bg-white">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <Fragment key={row.id}>
                        <TableRow className="bg-white">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="bg-white">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        {row.getIsExpanded() && (
                          <TableRow className="bg-white">
                            <TableCell colSpan={row.getVisibleCells().length} className="p-0 bg-white">
                              <RunExpandedRow run={row.original} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <TableRow className="bg-white">
                      <TableCell colSpan={columns.length} className="h-24 text-center bg-white">
                        No runs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function RunExpandedRow({ run }: { run: WorkflowRunSummary }) {
  const {
    data: historyResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<RunHistoryResponse>({
    queryKey: ['run-history', run.run_id],
    queryFn: async () => {
      return backendApiClient.request<RunHistoryResponse>(
        `/api/v1/runs/${run.run_id}/history`,
        { method: 'GET' }
      );
    },
    enabled: !!run.run_id,
    refetchInterval: run.status === 'running' ? 5000 : false,
  });

  const historyEntries = historyResponse?.history ?? [];
  const historyError =
    isError && error
      ? error instanceof Error
        ? error.message
        : 'Unable to load history'
      : null;

  const hasInputs = !!run.inputs && Object.keys(run.inputs).length > 0;
  const hasOutput = !!run.output && Object.keys(run.output).length > 0;

  return (
    <div className="p-4 bg-white">
      {run.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Execution Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <pre className="text-sm whitespace-pre-wrap font-mono break-words">
              {run.error}
            </pre>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="output" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input" className="flex items-center gap-2">
            <FileInput className="w-4 h-4" />
            Input
          </TabsTrigger>
          <TabsTrigger value="output" className="flex items-center gap-2">
            <FileOutput className="w-4 h-4" />
            Output
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="mt-4">
          {hasInputs ? (
            <div className="w-full max-w-full text-left border rounded-md p-4 bg-white">
              <div className="h-[400px] overflow-auto bg-white">
                <JsonViewer
                  value={run.inputs}
                  theme="auto"
                  defaultInspectDepth={0}
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No input data provided
            </div>
          )}
        </TabsContent>

        <TabsContent value="output" className="mt-4">
          {hasOutput ? (
            <div className="w-full max-w-full text-left border rounded-md p-4 bg-white">
              <div className="h-[400px] overflow-auto bg-white">
                <JsonViewer
                  value={run.output}
                  theme="auto"
                  defaultInspectDepth={0}
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {run.status === 'running' || run.status === 'queued'
                ? 'Execution in progress...'
                : 'No output data available'}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">History snapshots</h4>
          {run.status === 'running' && (
            <span className="text-xs text-muted-foreground">Auto-refreshing</span>
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading history...
          </div>
        ) : historyError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load history</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">{historyError}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : historyEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {run.status === 'running'
              ? 'History will appear once checkpoints are emitted.'
              : 'No history available for this run.'}
          </div>
        ) : (
          <div className="space-y-3">
            {historyEntries.map((entry, index) => {
              const checkpointId = entry.checkpoint_id ?? `snapshot-${index}`;
              const createdAt = entry.created_at;
              return (
                <div key={checkpointId} className="border rounded-md overflow-hidden">
                  <div className="px-4 py-2 border-b flex items-center justify-between text-xs text-muted-foreground">
                    <span>Checkpoint {checkpointId}</span>
                    {createdAt && (
                      <span>{format(new Date(createdAt), 'MMM d, yyyy h:mm:ss a')}</span>
                    )}
                  </div>
                  <div className="max-h-[240px] overflow-auto bg-white">
                    <JsonViewer
                      value={entry}
                      theme="auto"
                      defaultInspectDepth={1}
                      style={{ padding: '0.5rem' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

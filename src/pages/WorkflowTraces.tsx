/**
 * Workflow Traces Page
 * 
 * List page for all workflow execution traces with expandable accordion rows
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@tanstack/react-table';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, Play, AlertCircle, ChevronRight } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { WorkflowTraceViewer } from '@/components/workflow/WorkflowTraceViewer';
import { useQuery as useRunHistoryQuery } from '@tanstack/react-query';
import type { WorkflowSummary } from '@/types/workflow-spec';

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

interface WorkflowRunWithInfo extends WorkflowRunSummary {
  workflow_id: string;
  workflow_name: string;
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

interface ExpandedRowContentProps {
  run: WorkflowRunWithInfo;
}

function ExpandedRowContent({ run }: ExpandedRowContentProps) {
  const { data: historyResponse, isLoading } = useRunHistoryQuery({
    queryKey: ['run-history', run.run_id],
    queryFn: async () => {
      return backendApiClient.request<{
        run_id: string;
        history: Array<{
          run_id: string;
          workflow_id: string | null;
          status: string;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
          nodes: any[];
          execution_graph?: {
            nodes: Array<{ id: string; type: string; label: string }>;
            edges: Array<{ source: string; target: string }>;
          };
        }>;
      }>(`/api/v1/runs/${run.run_id}/history`, { method: 'GET' });
    },
    enabled: true,
  });

  const historyEntry = historyResponse?.history?.[0];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!historyEntry) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        No execution history available
      </div>
    );
  }

  return (
    <div className="p-6 border-t bg-muted/10">
      <WorkflowTraceViewer
        runId={run.run_id}
        workflowId={run.workflow_id}
        nodes={historyEntry.nodes || []}
        status={historyEntry.status as RunStatus}
        createdAt={historyEntry.created_at}
        startedAt={historyEntry.started_at}
        finishedAt={historyEntry.finished_at}
        inputs={run.inputs}
        output={run.output}
        compact={true}
        viewMode="graph"
        executionGraph={historyEntry.execution_graph}
      />
    </div>
  );
}

export default function WorkflowTraces() {
  const navigate = useNavigate();
  
  // Fetch all workflows
  const { data: workflows, isLoading: isLoadingWorkflows } = useQuery<WorkflowSummary[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ items: WorkflowSummary[] }>(
        '/api/v1/workflows',
        { method: 'GET' }
      );
      return response.items;
    },
  });

  // Fetch runs for all workflows
  const { data: allRuns, isLoading: isLoadingRuns } = useQuery<WorkflowRunWithInfo[]>({
    queryKey: ['all-workflow-runs', workflows?.map(w => w.workflow_id)],
    queryFn: async () => {
      if (!workflows || workflows.length === 0) return [];
      
      // Fetch runs for each workflow in parallel
      const runPromises = workflows.map(async (workflow) => {
        try {
          const response = await backendApiClient.request<WorkflowRunListResponse>(
            `/api/v1/workflows/${workflow.workflow_id}/runs`,
            { method: 'GET' }
          );
          return response.runs.map(run => ({
            ...run,
            workflow_id: workflow.workflow_id,
            workflow_name: workflow.name,
          }));
        } catch (error) {
          console.error(`Failed to fetch runs for workflow ${workflow.workflow_id}:`, error);
          return [];
        }
      });
      
      const allRunsArrays = await Promise.all(runPromises);
      const flattened = allRunsArrays.flat();
      
      // Sort by created_at (newest first)
      return flattened.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    },
    enabled: !!workflows && workflows.length > 0,
    refetchInterval: 5000, // Poll frequently to keep statuses fresh
  });

  const runs = allRuns ?? [];
  const isLoading = isLoadingWorkflows || isLoadingRuns;
  
  // Calculate aggregate stats
  const stats = useMemo(() => {
    if (!runs.length) return null;
    const total = runs.length;
    const completed = runs.filter(run => run.status === 'succeeded').length;
    return { total, completed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [runs]);

  // Define table columns
  const columns = useMemo<ColumnDef<WorkflowRunWithInfo>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronRight
              className={row.getIsExpanded() ? 'rotate-90 transition-transform' : 'transition-transform'}
            />
          </button>
        );
      },
    },
    {
      accessorKey: 'workflow_name',
      header: 'Workflow',
      cell: ({ row }) => {
        return (
          <span className="font-medium text-sm">
            {row.getValue('workflow_name')}
          </span>
        );
      },
    },
    {
      accessorKey: 'run_id',
      header: 'Run ID',
      cell: ({ row }) => {
        const run = row.original;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/workflows/${run.workflow_id}/traces/${run.run_id}`);
            }}
            className="font-medium text-primary hover:underline text-left text-sm"
          >
            {row.getValue('run_id')}
          </button>
        );
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
  ], [navigate]);

  const table = useReactTable({
    data: runs,
    columns,
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
            All Workflow Traces
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
              <p className="text-sm">Loading traces...</p>
            </div>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No traces yet</h3>
                <p className="text-sm text-muted-foreground">
                  Execute workflows to see execution traces and results here.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/workflows`)}
                variant="outline"
              >
                Go to Workflow Editor
              </Button>
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
                      <React.Fragment key={row.id}>
                        <TableRow
                          className="bg-white hover:bg-muted/50"
                        >
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
                            <TableCell colSpan={columns.length} className="bg-white p-0">
                              <ExpandedRowContent run={row.original} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow className="bg-white">
                      <TableCell colSpan={columns.length} className="h-24 text-center bg-white">
                        No traces found.
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

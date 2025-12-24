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
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
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

function calculateDuration(startedAt: string, completedAt?: string): number | null {
  if (!completedAt) return null;
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
        `/api/workflows/${workflowId}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!workflowId,
  });
  
  // Fetch all executions for this workflow
  const { data: executions, isLoading } = useQuery<Execution[]>({
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
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!executions) return null;
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    return { total, completed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [executions]);

  // Define table columns
  const columns = useMemo<ColumnDef<Execution>[]>(() => [
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
      accessorKey: 'id',
      header: 'Execution #',
      cell: ({ row }) => {
        return <span className="font-medium">#{row.getValue('id')}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as Execution['status'];
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
        const startedAt = row.getValue('started_at') as string;
        return (
          <span className="text-sm">
            {format(new Date(startedAt), 'MMM d, yyyy h:mm a')}
          </span>
        );
      },
    },
    {
      accessorKey: 'completed_at',
      header: 'Completed',
      cell: ({ row }) => {
        const completedAt = row.original.completed_at;
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
        const duration = calculateDuration(row.original.started_at, row.original.completed_at);
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
        const errorMessage = row.original.error_message;
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
    data: executions || [],
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Render expanded row content
  const renderExpandedContent = (execution: Execution) => {
    return (
      <div className="p-4 bg-white">
        {/* Error Alert */}
        {execution.error_message && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Execution Failed</AlertTitle>
            <AlertDescription className="mt-2">
              <pre className="text-sm whitespace-pre-wrap font-mono break-words">
                {execution.error_message}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs for Input/Output */}
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
            {execution.input_data && Object.keys(execution.input_data).length > 0 ? (
              <div className="w-full max-w-full text-left border rounded-md p-4 bg-white">
                <div className="h-[400px] overflow-auto bg-white">
                  <JsonViewer
                    value={execution.input_data}
                    theme="auto"
                    defaultInspectDepth={0}
                    style={{
                      padding: '0.5rem',
                    }}
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
            {execution.output_data && Object.keys(execution.output_data).length > 0 ? (
              <div className="w-full max-w-full text-left border rounded-md p-4 bg-white">
                <div className="h-[400px] overflow-auto bg-white">
                  <JsonViewer
                    value={execution.output_data}
                    theme="auto"
                    defaultInspectDepth={0}
                    style={{
                      padding: '0.5rem',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {execution.status === 'running' 
                  ? 'Execution in progress...' 
                  : 'No output data available'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

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
        ) : executions && executions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
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
                              {renderExpandedContent(row.original)}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <TableRow className="bg-white">
                      <TableCell colSpan={columns.length} className="h-24 text-center bg-white">
                        No executions found.
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

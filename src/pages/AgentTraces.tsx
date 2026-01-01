/**
 * Agent Traces Page
 * 
 * List page for agent conversation traces
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  useReactTable,
} from '@tanstack/react-table';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';

interface AgentTraceSummary {
  thread_id: string;
  workflow_id?: string | null;
  workflow_name?: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  title?: string | null;
}

interface AgentTraceListResponse {
  traces: AgentTraceSummary[];
  total: number;
}

export default function AgentTraces() {
  const navigate = useNavigate();

  // Fetch agent traces
  const { data: tracesResponse, isLoading, isError, error } = useQuery<AgentTraceListResponse>({
    queryKey: ['agent-traces'],
    queryFn: async () => {
      const response = await backendApiClient.request<AgentTraceListResponse>(
        '/api/agents/traces',
        { method: 'GET' }
      );
      return response;
    },
  });

  const traces = tracesResponse?.traces ?? [];

  // Define table columns
  const columns = useMemo<ColumnDef<AgentTraceSummary>[]>(() => [
    {
      accessorKey: 'thread_id',
      header: 'Thread ID',
      cell: ({ row }) => {
        return (
          <button
            onClick={() => navigate(`/agents/traces/${row.original.thread_id}`)}
            className="font-medium text-primary hover:underline text-left"
          >
            {row.getValue('thread_id')}
          </button>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const title = row.getValue('title') as string | null | undefined;
        return (
          <span className="text-sm text-left">
            {title || <span className="text-muted-foreground italic">Untitled</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'workflow_name',
      header: 'Workflow',
      cell: ({ row }) => {
        const workflowName = row.original.workflow_name;
        return (
          <span className="text-sm text-left">
            {workflowName || <span className="text-muted-foreground">-</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'message_count',
      header: 'Messages',
      cell: ({ row }) => {
        const count = row.getValue('message_count') as number;
        return (
          <Badge variant="secondary" className="text-xs text-left">
            {count}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Updated',
      cell: ({ row }) => {
        const updatedAt = row.getValue('updated_at') as string;
        return (
          <span className="text-sm text-left">
            {format(new Date(updatedAt), 'MMM d, yyyy h:mm a')}
          </span>
        );
      },
    },
  ], [navigate]);

  const table = useReactTable({
    data: traces,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading agent traces...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading traces</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm">
                  {error instanceof Error ? error.message : 'Unable to load agent traces'}
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : traces.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No traces yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with an agent to see traces here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="w-full overflow-x-auto bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
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
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/agents/traces/${row.original.thread_id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="text-left">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
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

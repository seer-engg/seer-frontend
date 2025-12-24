/**
 * Traces Page
 * 
 * Displays all agent traces (workflow, chat, orchestrator) in a table.
 * Traces are queried from Postgres checkpoints.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
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
  useReactTable,
} from '@tanstack/react-table';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Trace {
  thread_id: string;
  checkpoint_id?: string;
  timestamp: string;
  trace_type: 'workflow' | 'chat' | 'orchestrator' | 'unknown';
  status: 'running' | 'completed' | 'interrupted' | 'failed';
  node?: string;
  metadata?: Record<string, any>;
  message_count?: number;
  duration_ms?: number;
}

interface TraceListResponse {
  traces: Trace[];
  total: number;
  limit: number;
  offset: number;
}

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case 'interrupted':
      return <Badge variant="secondary" className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Interrupted</Badge>;
    case 'running':
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    workflow: 'bg-blue-500',
    chat: 'bg-purple-500',
    orchestrator: 'bg-orange-500',
    unknown: 'bg-gray-500',
  };
  return (
    <Badge className={colors[type] || 'bg-gray-500'}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function parseThreadId(thread_id: string): { workflowId: string | null; threadId: string } {
  // Pattern: workflow-{id}-{uuid}
  // Example: workflow-5-e97008159b38422a9993f421d30c4...
  const workflowPattern = /^workflow-(\d+)-(.+)$/;
  const match = thread_id.match(workflowPattern);
  
  if (match) {
    return {
      workflowId: match[1], // Extract the numeric ID
      threadId: match[2],   // Extract the UUID part
    };
  }
  
  // For non-workflow thread_ids, return null for workflowId and full thread_id
  return {
    workflowId: null,
    threadId: thread_id,
  };
}

export default function Traces() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [threadIdFilter, setThreadIdFilter] = useState<string>('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch traces
  const { data, isLoading, error, refetch } = useQuery<TraceListResponse>({
    queryKey: ['traces', selectedType, threadIdFilter, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (selectedType !== 'all') {
        params.append('trace_type', selectedType);
      }
      if (threadIdFilter) {
        params.append('thread_id_pattern', threadIdFilter);
      }
      
      const response = await backendApiClient.request<TraceListResponse>(
        `/api/traces?${params.toString()}`,
        { method: 'GET' }
      );
      return response;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const traces = data?.traces || [];
  const total = data?.total || 0;

  // Define table columns
  const columns = useMemo<ColumnDef<Trace>[]>(
    () => [
      {
        accessorKey: 'thread_id',
        header: 'Workflow ID',
        cell: ({ row }) => {
          const { workflowId } = parseThreadId(row.original.thread_id);
          return (
            <div className="text-sm">
              {workflowId || '-'}
            </div>
          );
        },
      },
      {
        id: 'thread_uuid',
        header: 'Thread ID',
        cell: ({ row }) => {
          const { threadId } = parseThreadId(row.original.thread_id);
          return (
            <div className="font-mono text-xs">
              {threadId.length > 40
                ? `${threadId.substring(0, 40)}...`
                : threadId}
            </div>
          );
        },
      },
      {
        accessorKey: 'trace_type',
        header: 'Type',
        cell: ({ row }) => getTypeBadge(row.original.trace_type),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => (
          <div className="text-sm">
            {format(new Date(row.original.timestamp), 'MMM d, yyyy HH:mm:ss')}
          </div>
        ),
      },
      {
        accessorKey: 'duration_ms',
        header: 'Duration',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDuration(row.original.duration_ms)}
          </div>
        ),
      },
      {
        accessorKey: 'message_count',
        header: 'Messages',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.message_count ?? '-'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/traces/${encodeURIComponent(row.original.thread_id)}`)}
          >
            View Details
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: traces,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/workflows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Traces</h1>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="workflow">Workflow</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="orchestrator">Orchestrator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Failed to load traces. Please try again.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No traces found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


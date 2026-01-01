/**
 * Flattened Trace Table Component
 * Displays all trace items (messages, tool calls, inputs, etc.) in a flat table view
 */

import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  ExpandedState,
  ColumnSizingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JsonViewer } from '@textea/json-viewer';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FlattenedTraceItem, FlattenedTraceItemType } from '@/types/trace';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { extractRelevantContent } from '@/utils/json-viewer-utils';

interface FlattenedTraceTableProps {
  items: FlattenedTraceItem[];
  className?: string;
}

function getTypeBadge(type: FlattenedTraceItemType) {
  const variants: Record<FlattenedTraceItemType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    human: 'default',
    ai: 'secondary',
    assistant: 'secondary',
    tool: 'outline',
    thinking: 'outline',
    search: 'outline',
    input: 'default',
    system: 'outline',
    unknown: 'outline',
  };

  const labels: Record<FlattenedTraceItemType, string> = {
    human: 'Human',
    ai: 'AI',
    assistant: 'AI',
    tool: 'Tool',
    thinking: 'Thinking',
    search: 'Search',
    input: 'Input',
    system: 'System',
    unknown: 'Unknown',
  };

  return (
    <Badge variant={variants[type] || 'outline'} className="text-xs">
      {labels[type] || type}
    </Badge>
  );
}

function formatContent(content: unknown): string {
  if (content === undefined || content === null) return '-';
  if (typeof content === 'string') {
    return content.length > 100 ? `${content.substring(0, 100)}...` : content;
  }
  if (typeof content === 'object') {
    try {
      const str = JSON.stringify(content);
      return str.length > 100 ? `${str.substring(0, 100)}...` : str;
    } catch {
      return '[Object]';
    }
  }
  return String(content);
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'string') {
    return value.length > 50 ? `${value.substring(0, 50)}...` : value;
  }
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? `${str.substring(0, 50)}...` : str;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

export function FlattenedTraceTable({ items, className }: FlattenedTraceTableProps) {
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const columns = useMemo<ColumnDef<FlattenedTraceItem>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        cell: ({ row }) => {
          const hasDetails = 
            row.original.content ||
            row.original.outputs ||
            Object.keys(row.original.metadata || {}).length > 0;

          if (!hasDetails) return null;

          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
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
        size: 40,
        enableResizing: false,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => getTypeBadge(row.original.type),
        size: 100,
        enableResizing: true,
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <div className="font-mono text-xs max-w-[200px] truncate" title={row.original.id}>
            {row.original.id}
          </div>
        ),
        size: 200,
        enableResizing: true,
      },
      {
        accessorKey: 'content',
        header: 'Content',
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate text-sm" title={formatContent(row.original.content)}>
            {formatContent(row.original.content)}
          </div>
        ),
        size: 300,
        enableResizing: true,
      },
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ row }) => {
          if (!row.original.timestamp) return <span className="text-muted-foreground">-</span>;
          try {
            return (
              <div className="text-xs">
                {format(new Date(row.original.timestamp), 'HH:mm:ss.SSS')}
              </div>
            );
          } catch {
            return <span className="text-muted-foreground">-</span>;
          }
        },
        size: 120,
        enableResizing: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      expanded: expandedRows,
      columnSizing,
    },
    onExpandedChange: setExpandedRows,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 50,
      size: 150,
      maxSize: Number.MAX_SAFE_INTEGER,
    },
  });

  // Generate CSS variables for column widths
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing, table.getFlatHeaders()]);

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-md border" style={columnSizeVars}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const width = `calc(var(--header-${header.id}-size) * 1px)`;
                  return (
                    <TableHead
                      key={header.id}
                      className="group relative"
                      style={{ width }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex select-none items-center">
                          <span className="truncate">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanResize() && (
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={cn(
                                "absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none bg-secondary opacity-0 group-hover:opacity-100 transition-opacity",
                                header.column.getIsResizing() && "bg-primary opacity-100"
                              )}
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No trace items found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <>
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => {
                      const width = `calc(var(--col-${cell.column.id}-size) * 1px)`;
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                        <Tabs defaultValue="run" className="w-full">
                          <TabsList className="w-full justify-start rounded-none border-b bg-muted/50">
                            <TabsTrigger value="run">Run</TabsTrigger>
                            {row.original.metadata && Object.keys(row.original.metadata).length > 0 && (
                              <TabsTrigger value="metadata">Metadata</TabsTrigger>
                            )}
                          </TabsList>
                          <TabsContent value="run" className="p-4 m-0 text-left space-y-4">
                            {/* Input Section */}
                            {(row.original.inputs || (row.original.type === 'tool' && row.original.content)) && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                  {row.original.type === 'human' || row.original.type === 'input' ? 'USER' : 'Input'}
                                </div>
                                <div className="text-left [&>*]:text-left">
                                  {row.original.inputs ? (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.inputs)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  ) : row.original.type === 'tool' && typeof row.original.content === 'object' ? (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.content)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  ) : typeof row.original.content === 'string' ? (
                                    <pre className="text-xs whitespace-pre-wrap text-left">{row.original.content}</pre>
                                  ) : row.original.content ? (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.content)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Output Section */}
                            {(row.original.outputs || (row.original.type === 'tool' && row.original.metadata?.result)) && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Output</div>
                                <div className="text-left [&>*]:text-left">
                                  {row.original.outputs ? (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.outputs)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  ) : row.original.metadata?.result ? (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.metadata.result)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Fallback: Show content if no inputs/outputs */}
                            {!row.original.inputs && !row.original.outputs && row.original.content && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Content</div>
                                <div className="text-left [&>*]:text-left">
                                  {typeof row.original.content === 'string' ? (
                                    <pre className="text-xs whitespace-pre-wrap text-left">{row.original.content}</pre>
                                  ) : (
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.content)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </TabsContent>
                          {row.original.metadata && Object.keys(row.original.metadata).length > 0 && (
                            <TabsContent value="metadata" className="p-4 m-0 text-left">
                              <div className="space-y-4">
                                {/* Technical Metadata */}
                                <div className="space-y-2">
                                  {row.original.id && (
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Trace ID:</span>{' '}
                                      <span className="font-mono text-xs">{row.original.id}</span>
                                    </div>
                                  )}
                                  {row.original.checkpoint_id && (
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Checkpoint ID:</span>{' '}
                                      <span className="font-mono text-xs">{row.original.checkpoint_id}</span>
                                    </div>
                                  )}
                                  {row.original.timestamp && (
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Timestamp:</span>{' '}
                                      <span className="font-mono text-xs">
                                        {format(new Date(row.original.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                                      </span>
                                    </div>
                                  )}
                                  {row.original.checkpoint_index !== undefined && (
                                    <div className="text-sm">
                                      <span className="font-medium text-muted-foreground">Checkpoint Index:</span>{' '}
                                      <span className="font-mono text-xs">{row.original.checkpoint_index}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Full Metadata JSON */}
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-muted-foreground">Full Metadata</div>
                                  <div className="text-left [&>*]:text-left">
                                    <JsonViewer
                                      value={extractRelevantContent(row.original.metadata)}
                                      theme="auto"
                                      displayDataTypes={false}
                                      displayObjectSize={false}
                                      collapsed={2}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          )}
                        </Tabs>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Showing {items.length} trace item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}


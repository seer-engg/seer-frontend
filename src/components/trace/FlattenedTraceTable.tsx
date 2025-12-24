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
                        <Tabs defaultValue="content" className="w-full">
                          <TabsList className="w-full justify-start rounded-none border-b bg-muted/50">
                            <TabsTrigger value="content">Content</TabsTrigger>
                            {row.original.metadata && Object.keys(row.original.metadata).length > 0 && (
                              <TabsTrigger value="metadata">Metadata</TabsTrigger>
                            )}
                          </TabsList>
                          <TabsContent value="content" className="p-4 m-0 text-left">
                            {/* Content */}
                            {row.original.content && (
                              <div>
                                {typeof row.original.content === 'string' ? (
                                  <pre className="text-xs whitespace-pre-wrap">{row.original.content}</pre>
                                ) : (
                                  <JsonViewer
                                    value={row.original.content}
                                    rootName="content"
                                    theme="auto"
                                    displayDataTypes={false}
                                    displayObjectSize={false}
                                    collapsed={1}
                                  />
                                )}
                              </div>
                            )}

                            {/* Outputs */}
                            {row.original.outputs && (
                              <div className="mt-4">
                                <JsonViewer
                                  value={row.original.outputs}
                                  rootName="outputs"
                                  theme="auto"
                                  displayDataTypes={false}
                                  displayObjectSize={false}
                                  collapsed={1}
                                />
                              </div>
                            )}
                          </TabsContent>
                          {row.original.metadata && Object.keys(row.original.metadata).length > 0 && (
                            <TabsContent value="metadata" className="p-4 m-0 text-left">
                              <JsonViewer
                                value={row.original.metadata}
                                rootName="metadata"
                                theme="auto"
                                displayDataTypes={false}
                                displayObjectSize={false}
                                collapsed={2}
                              />
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


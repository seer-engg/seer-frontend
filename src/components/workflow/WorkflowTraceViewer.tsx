/**
 * WorkflowTraceViewer - Vertical timeline view of workflow execution traces
 * 
 * Focuses on data inspection: node inputs/outputs, execution timing, error details
 */
import { useState, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { WorkflowNodeExecutionCard, WorkflowNodeTrace } from './WorkflowNodeExecutionCard';
import { WorkflowInputOutput } from './WorkflowInputOutput';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface WorkflowTraceViewerProps {
  runId: string;
  workflowId: string;
  nodes: WorkflowNodeTrace[];
  status: RunStatus;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  inputs?: Record<string, any> | null;
  output?: Record<string, any> | null;
  compact?: boolean;
}

function calculateDuration(startedAt?: string | null, finishedAt?: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  return Math.round((end - start) / 1000);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function WorkflowTraceViewer({
  runId,
  workflowId,
  nodes,
  status,
  createdAt,
  startedAt,
  finishedAt,
  inputs,
  output,
  compact = false,
}: WorkflowTraceViewerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Sort nodes by timestamp (chronological order)
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }, [nodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Calculate summary stats
  const totalDuration = calculateDuration(startedAt, finishedAt);
  const succeededCount = sortedNodes.filter((n) => !n.error && n.output !== undefined).length;
  const failedCount = sortedNodes.filter((n) => !!n.error).length;
  const totalNodes = sortedNodes.length;

  return (
    <div className={cn('space-y-6', compact && 'space-y-4')}>
      {/* Header: Run Metadata */}
      <div className={cn('space-y-4', compact && 'space-y-2')}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className={cn('font-semibold', compact ? 'text-base' : 'text-lg')}>
              {compact ? `Run: ${runId.slice(0, 8)}...` : `Run: ${runId}`}
            </h2>
            {!compact && (
              <p className="text-sm text-muted-foreground">
                Created: {format(new Date(createdAt), 'MMM d, yyyy h:mm:ss a')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status === 'succeeded'
                    ? 'default'
                    : status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {totalDuration !== null && (
              <div className="text-sm">
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-semibold">{formatDuration(totalDuration)}</span>
              </div>
            )}
            {!compact && startedAt && (
              <div className="text-sm">
                <span className="text-muted-foreground">Started: </span>
                <span>{format(new Date(startedAt), 'MMM d, yyyy h:mm:ss a')}</span>
              </div>
            )}
            {!compact && finishedAt && (
              <div className="text-sm">
                <span className="text-muted-foreground">Finished: </span>
                <span>{format(new Date(finishedAt), 'MMM d, yyyy h:mm:ss a')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!compact && <Separator />}

      {/* Input/Output Summary */}
      {!compact && (inputs || output) && (
        <>
          <WorkflowInputOutput inputs={inputs} output={output} status={status} />
          <Separator />
        </>
      )}

      {/* Node Execution Timeline */}
      <div className={cn('space-y-4', compact && 'space-y-2')}>
        {!compact && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Node Execution Timeline</h3>
            <div className="text-sm text-muted-foreground">
              {totalNodes} node{totalNodes !== 1 ? 's' : ''} executed
            </div>
          </div>
        )}

        {sortedNodes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border rounded-md">
            No node execution data available
          </div>
        ) : (
          <div className={cn('space-y-3', compact && 'space-y-2 max-h-[600px] overflow-y-auto')}>
            {sortedNodes.map((node, index) => (
              <div key={node.node_id} className="relative">
                {/* Timeline connector line */}
                {index < sortedNodes.length - 1 && !compact && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border -z-10" />
                )}
                <WorkflowNodeExecutionCard
                  node={node}
                  isExpanded={expandedNodes.has(node.node_id)}
                  onToggle={() => toggleNode(node.node_id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {!compact && (
        <>
          <Separator />
          <div className="flex items-center justify-between text-sm py-2">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Total execution time: </span>
                <span className="font-semibold">
                  {totalDuration !== null ? formatDuration(totalDuration) : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Nodes executed: </span>
                <span className="font-semibold">
                  {totalNodes > 0 ? `${succeededCount + failedCount}/${totalNodes}` : '0'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {succeededCount > 0 && (
                <div>
                  <span className="text-muted-foreground">Succeeded: </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {succeededCount}
                  </span>
                </div>
              )}
              {failedCount > 0 && (
                <div>
                  <span className="text-muted-foreground">Failed: </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {failedCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


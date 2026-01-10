import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { RunHistoryEntry } from './types';

interface TraceOverviewProps {
  entry: RunHistoryEntry;
}

function calculateDuration(startedAt?: string | null, finishedAt?: string | null): string {
  if (!startedAt || !finishedAt) return '-';
  const seconds = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'succeeded':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'failed':
      return 'bg-bug/10 text-bug dark:text-bug border-bug/20';
    case 'running':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'queued':
      return 'bg-muted/10 text-muted-foreground border-muted/20';
    case 'cancelled':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
}

export function TraceOverview({ entry }: TraceOverviewProps) {
  const duration = calculateDuration(entry.started_at, entry.finished_at);
  const successCount = entry.nodes?.filter((n) => !n.error).length || 0;
  const failedCount = entry.nodes?.filter((n) => !!n.error).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-muted-foreground">{entry.run_id}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getStatusBadgeClasses(entry.status)}>
              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(entry.created_at), 'MMM d, h:mm a')}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Duration: {duration}</span>
          </div>
        </div>
      </div>

      {entry.nodes && entry.nodes.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Nodes:</span>
            <span className="font-medium">{entry.nodes.length}</span>
          </div>
          {successCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">Succeeded:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {successCount}
              </span>
            </div>
          )}
          {failedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-bug">Failed:</span>
              <span className="font-medium text-bug">{failedCount}</span>
            </div>
          )}
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {entry.inputs && Object.keys(entry.inputs).length > 0 && (
          <AccordionItem value="inputs">
            <AccordionTrigger className="text-sm">Workflow Inputs</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto scrollbar-thin">
                {JSON.stringify(entry.inputs, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        )}
        {entry.output && Object.keys(entry.output).length > 0 && (
          <AccordionItem value="output">
            <AccordionTrigger className="text-sm">Workflow Output</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto scrollbar-thin">
                {JSON.stringify(entry.output, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

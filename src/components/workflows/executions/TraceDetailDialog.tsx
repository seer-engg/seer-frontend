import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { backendApiClient } from '@/lib/api-client';
import { TraceOverview } from './TraceOverview';
import { WaterfallTimeline } from './WaterfallTimeline';
import type { RunHistoryResponse } from './types';

interface TraceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  workflowId: string | null;
}

export function TraceDetailDialog({
  open,
  onOpenChange,
  runId,
}: TraceDetailDialogProps) {
  const { data, isLoading, error, refetch } = useQuery<RunHistoryResponse>({
    queryKey: ['run-history', runId],
    queryFn: async () => {
      return backendApiClient.request<RunHistoryResponse>(
        `/api/v1/runs/${runId}/history`,
        { method: 'GET' }
      );
    },
    enabled: !!runId && open,
    refetchInterval: (query) => {
      const response = query.state.data;
      const entry = response?.history?.[0];
      return entry?.status === 'running' || entry?.status === 'queued' ? 3000 : false;
    },
  });

  const entry = data?.history?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Execution Trace: {runId.slice(0, 12)}...
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">Failed to load execution trace</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && !entry && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No trace data available</p>
          </div>
        )}

        {!isLoading && !error && entry && (
          <ScrollArea className="max-h-[calc(85vh-8rem)] pr-4">
            <div className="space-y-6">
              <TraceOverview entry={entry} />

              {entry.nodes && entry.nodes.length > 0 && (
                <>
                  <Separator />
                  <WaterfallTimeline
                    nodes={entry.nodes}
                    startTime={entry.started_at}
                    endTime={entry.finished_at}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

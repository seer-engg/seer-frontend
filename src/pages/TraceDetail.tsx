/**
 * Trace Detail Page
 * 
 * Displays detailed information for a single trace, showing
 * the current state snapshot.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Copy, CopyCheck } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { FlattenedTraceTable } from '@/components/trace/FlattenedTraceTable';
import { flattenTraceItems } from '@/utils/flatten-trace-items';
import { toast } from '@/components/ui/sonner';

interface TraceDetail {
  thread_id: string;
  checkpoints: Array<{
    checkpoint_id?: string;
    timestamp: string;
    checkpoint: Record<string, any>;
    config: Record<string, any>;
  }>;
  current_state?: {
    values?: Record<string, any>;
    next?: any;
  };
  metadata?: Record<string, any>;
}

export default function TraceDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: trace, isLoading, error } = useQuery<TraceDetail>({
    queryKey: ['trace', threadId],
    queryFn: async () => {
      const response = await backendApiClient.request<TraceDetail>(
        `/api/traces/${encodeURIComponent(threadId!)}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!threadId,
  });

  // Flatten trace items from current state
  const flattenedStateItems = useMemo(() => {
    if (!trace?.current_state) return [];
    return flattenTraceItems([], trace.current_state);
  }, [trace]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading trace details...</div>
        </div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 text-destructive">
          Failed to load trace details. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/traces')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Trace Details</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground font-mono text-sm">
                {trace.thread_id}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trace.thread_id);
                    setCopied(true);
                    toast.success('Copied to clipboard');
                    setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    toast.error('Failed to copy');
                  }
                }}
              >
                {copied ? (
                  <CopyCheck className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Current State */}
      {trace.current_state ? (
        <div className="space-y-4">
          {trace.current_state.next && (
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Next Node</h4>
              <Badge variant="outline" className="font-mono">
                {JSON.stringify(trace.current_state.next)}
              </Badge>
            </div>
          )}
          <ScrollArea className="h-[600px]">
            <FlattenedTraceTable items={flattenedStateItems} />
          </ScrollArea>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No current state available
        </div>
      )}
    </div>
  );
}


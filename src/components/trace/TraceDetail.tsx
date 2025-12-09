import { useQuery } from "@tanstack/react-query";
import { tracesAPI, type TraceDetail } from "@/lib/langsmith-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TraceTree } from "./TraceTree";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface TraceDetailProps {
  traceId: string;
}

export function TraceDetail({ traceId }: TraceDetailProps) {
  const {
    data: trace,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => tracesAPI.getTraceDetail(traceId),
  });

  const getStatusBadge = (status: TraceDetail["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="border-green-500/50 text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="border-red-500/50 text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs.toFixed(0)}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load trace:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!trace) {
    return (
      <Alert>
        <AlertDescription>Trace not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trace Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="mb-2">{trace.name}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(trace.status)}
                <Badge variant="secondary">{trace.project}</Badge>
                <Badge variant="outline">{trace.run_type}</Badge>
                {trace.start_time && (
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(trace.start_time), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                {trace.duration !== null && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(trace.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trace.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{trace.error}</AlertDescription>
            </Alert>
          )}
          
          {/* Inputs */}
          {trace.inputs && Object.keys(trace.inputs).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Inputs</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(trace.inputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Outputs */}
          {trace.outputs && Object.keys(trace.outputs).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Outputs</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(trace.outputs, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nested Runs Tree */}
      {trace.children && trace.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nested Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <TraceTree nodes={trace.children} />
          </CardContent>
        </Card>
      )}

      {(!trace.children || trace.children.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No nested runs found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}


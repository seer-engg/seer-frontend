import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { tracesAPI, type TraceSummary } from "@/lib/langsmith-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { getLangSmithTraceUrl } from "@/lib/langsmith-api";

interface TraceListProps {
  onSelectTrace: (traceId: string) => void;
  selectedTraceId?: string;
}

export function TraceList({ onSelectTrace, selectedTraceId }: TraceListProps) {
  const [projectFilter, setProjectFilter] = useState<
    "supervisor-v1" | "seer-v1" | "all"
  >("all");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">(
    "7d"
  );

  // Calculate start_time based on date range
  const getStartTime = (): string | undefined => {
    if (dateRange === "all") return undefined;
    const hours = dateRange === "24h" ? 24 : dateRange === "7d" ? 168 : 720;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return startTime.toISOString();
  };

  const {
    data: traces,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["traces", projectFilter, dateRange],
    queryFn: () =>
      tracesAPI.listTraces({
        project: projectFilter === "all" ? undefined : projectFilter,
        limit: 100,
        start_time: getStartTime(),
      }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusBadge = (status: TraceSummary["status"]) => {
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Project</label>
            <Select
              value={projectFilter}
              onValueChange={(value) =>
                setProjectFilter(value as typeof projectFilter)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="supervisor-v1">Supervisor v1</SelectItem>
                <SelectItem value="seer-v1">Seer v1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Select
              value={dateRange}
              onValueChange={(value) =>
                setDateRange(value as typeof dateRange)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Traces List */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load traces:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {traces && traces.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No traces found for the selected filters.
          </CardContent>
        </Card>
      )}

      {traces && traces.length > 0 && (
        <div className="space-y-2">
          {traces.map((trace) => (
            <Card
              key={trace.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedTraceId === trace.id ? "border-primary" : ""
              }`}
              onClick={() => onSelectTrace(trace.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{trace.name}</h3>
                      {getStatusBadge(trace.status)}
                      <Badge variant="secondary" className="text-xs">
                        {trace.project}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {trace.start_time && (
                        <span>
                          {formatDistanceToNow(new Date(trace.start_time), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      {trace.duration !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(trace.duration)}
                        </span>
                      )}
                      <span className="text-xs">{trace.run_type}</span>
                    </div>
                    {trace.error && (
                      <p className="text-sm text-red-600 mt-2 truncate">
                        {trace.error}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(getLangSmithTraceUrl(trace.id), "_blank");
                    }}
                    title="Open in LangSmith"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


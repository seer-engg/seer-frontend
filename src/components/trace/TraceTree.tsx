import { useState } from "react";
import { type RunNode } from "@/lib/traces-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TraceTreeProps {
  nodes: RunNode[];
  depth?: number;
}

export function TraceTree({ nodes, depth = 0 }: TraceTreeProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TraceTreeNode key={node.id} node={node} depth={depth} />
      ))}
    </div>
  );
}

interface TraceTreeNodeProps {
  node: RunNode;
  depth: number;
}

function TraceTreeNode({ node, depth }: TraceTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;

  const getStatusBadge = (status: RunNode["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="border-green-500/50 text-green-600 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="border-red-500/50 text-red-600 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 text-xs">
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

  const paddingLeft = depth * 24;

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div style={{ paddingLeft: `${paddingLeft}px` }}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto hover:bg-accent/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {node.name}
                    </span>
                    {getStatusBadge(node.status)}
                    <Badge variant="secondary" className="text-xs">
                      {node.run_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {node.start_time && (
                      <span>
                        {formatDistanceToNow(new Date(node.start_time), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                    {node.duration !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(node.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1">
              <TraceTree nodes={node.children} depth={depth + 1} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Leaf node
  return (
    <div style={{ paddingLeft: `${paddingLeft}px` }}>
      <Card className="mb-1">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {node.name}
                </span>
                {getStatusBadge(node.status)}
                <Badge variant="secondary" className="text-xs">
                  {node.run_type}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                {node.start_time && (
                  <span>
                    {formatDistanceToNow(new Date(node.start_time), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                {node.duration !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(node.duration)}
                  </span>
                )}
              </div>
              {node.error && (
                <p className="text-xs text-red-600 mb-2">{node.error}</p>
              )}
              {node.inputs && Object.keys(node.inputs).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    Inputs
                  </summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(node.inputs, null, 2)}
                  </pre>
                </details>
              )}
              {node.outputs && Object.keys(node.outputs).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    Outputs
                  </summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(node.outputs, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


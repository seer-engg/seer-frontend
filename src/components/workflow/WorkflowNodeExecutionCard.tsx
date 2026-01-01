/**
 * WorkflowNodeExecutionCard - Individual node execution card in timeline
 * 
 * Displays node execution details with expandable inputs/outputs/errors
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { JsonViewer } from '@textea/json-viewer';
import { extractRelevantContent } from '@/utils/json-viewer-utils';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  Wrench,
  Brain,
  Code,
} from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface WorkflowNodeTrace {
  node_id: string;
  node_type: string;
  inputs?: Record<string, any>;
  output?: any;
  timestamp?: string;
  output_key?: string;
  tool_name?: string;
  model?: string;
  error?: string;
}

interface WorkflowNodeExecutionCardProps {
  node: WorkflowNodeTrace;
  isExpanded: boolean;
  onToggle: () => void;
}

function getStatusIcon(status: 'succeeded' | 'failed' | 'running' | 'queued') {
  switch (status) {
    case 'succeeded':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'queued':
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function getNodeTypeIcon(nodeType: string) {
  switch (nodeType) {
    case 'tool':
      return <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'llm':
      return <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    default:
      return <Code className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: 'succeeded' | 'failed' | 'running' | 'queued') {
  switch (status) {
    case 'succeeded':
      return 'default' as const;
    case 'failed':
      return 'destructive' as const;
    case 'running':
      return 'secondary' as const;
    case 'queued':
      return 'outline' as const;
  }
}

function calculateDuration(startedAt?: string, finishedAt?: string): number | null {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  return Math.round((end - start) / 1000);
}

export function WorkflowNodeExecutionCard({
  node,
  isExpanded,
  onToggle,
}: WorkflowNodeExecutionCardProps) {
  const status: 'succeeded' | 'failed' | 'running' | 'queued' = node.error
    ? 'failed'
    : node.output !== undefined
      ? 'succeeded'
      : 'running';

  const hasInputs = !!node.inputs && Object.keys(node.inputs).length > 0;
  const hasOutput = node.output !== undefined;
  const hasError = !!node.error;

  // Determine node display name
  const nodeDisplayName =
    node.tool_name || node.model || node.node_id;

  return (
    <Card
      className={cn(
        'transition-all',
        status === 'failed' && 'border-red-200 dark:border-red-800',
        status === 'succeeded' && 'border-green-200 dark:border-green-800',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">{getNodeTypeIcon(node.node_type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{node.node_id}</span>
                <Badge variant="outline" className="text-xs">
                  {node.node_type}
                </Badge>
                {nodeDisplayName && nodeDisplayName !== node.node_id && (
                  <span className="text-sm text-muted-foreground">
                    {node.node_type === 'tool' ? `tool: ${nodeDisplayName}` : `model: ${nodeDisplayName}`}
                  </span>
                )}
              </div>
              {node.output_key && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Output key: <code className="px-1 py-0.5 bg-muted rounded">{node.output_key}</code>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                {status}
              </Badge>
            </div>
            {node.timestamp && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(node.timestamp), 'HH:mm:ss')}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {(hasInputs || hasOutput || hasError) && (
        <CardContent className="pt-0">
          <Accordion type="single" collapsible value={isExpanded ? 'details' : undefined}>
            <AccordionItem value="details" className="border-0">
              <AccordionTrigger
                onClick={onToggle}
                className="py-2 hover:no-underline text-sm"
              >
                <span className="text-muted-foreground">
                  {isExpanded ? 'Hide' : 'Show'} details
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Inputs Section */}
                  {hasInputs && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>Inputs</span>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(node.inputs!).length}
                        </Badge>
                      </h4>
                      <div className="rounded-md border bg-background overflow-auto max-h-[400px]">
                        <div className="p-2 text-left [&>*]:text-left">
                          <JsonViewer
                            value={extractRelevantContent(node.inputs)}
                            theme="auto"
                            displayDataTypes={false}
                            displayObjectSize={false}
                            style={{
                              fontSize: '0.75rem',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Output Section */}
                  {hasOutput && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>Output</span>
                        {node.output_key && (
                          <Badge variant="outline" className="text-xs">
                            {node.output_key}
                          </Badge>
                        )}
                      </h4>
                      <div className="rounded-md border bg-background overflow-auto max-h-[400px]">
                        <div className="p-2 text-left [&>*]:text-left">
                          <JsonViewer
                            value={extractRelevantContent(node.output)}
                            theme="auto"
                            displayDataTypes={false}
                            displayObjectSize={false}
                            style={{
                              fontSize: '0.75rem',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Section */}
                  {hasError && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>Error</span>
                      </h4>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Execution Failed</AlertTitle>
                        <AlertDescription className="mt-2">
                          <pre className="text-sm whitespace-pre-wrap font-mono break-words">
                            {typeof node.error === 'string'
                              ? node.error
                              : JSON.stringify(node.error, null, 2)}
                          </pre>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}


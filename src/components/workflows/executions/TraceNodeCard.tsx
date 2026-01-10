import { format } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNodeTrace } from './types';

interface TraceNodeCardProps {
  node: WorkflowNodeTrace;
  index: number;
}

function getNodeDisplayName(nodeId: string, nodeType: string): string {
  return `${nodeType} (${nodeId.slice(0, 8)})`;
}

export function TraceNodeCard({ node, index }: TraceNodeCardProps) {
  const hasError = !!node.error;
  const borderClass = hasError
    ? 'border-l-4 border-l-bug'
    : 'border-l-4 border-l-emerald-500/50';

  return (
    <Card className={`p-3 ${borderClass}`}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasError ? (
              <AlertCircle className="w-4 h-4 text-bug shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                Node {index + 1}: {getNodeDisplayName(node.node_id, node.node_type)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {node.timestamp && (
                  <span>{format(new Date(node.timestamp), 'h:mm:ss a')}</span>
                )}
                {node.tool_name && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{node.tool_name}</span>
                  </>
                )}
                {node.model && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{node.model}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              hasError
                ? 'bg-bug/10 text-bug border-bug/20 shrink-0'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0'
            }
          >
            {hasError ? 'Failed' : 'Success'}
          </Badge>
        </div>

        {hasError && (
          <div className="bg-bug/10 border border-bug/20 rounded-md p-2">
            <p className="text-xs text-bug font-medium mb-1">Error:</p>
            <p className="text-xs text-bug">{node.error}</p>
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          {node.inputs && Object.keys(node.inputs).length > 0 && (
            <AccordionItem value="inputs" className="border-none">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                Inputs
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto scrollbar-thin max-h-60 overflow-y-auto">
                  {JSON.stringify(node.inputs, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          )}
          {node.output && (
            <AccordionItem value="output" className="border-none">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                Output
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto scrollbar-thin max-h-60 overflow-y-auto">
                  {typeof node.output === 'string'
                    ? node.output
                    : JSON.stringify(node.output, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </Card>
  );
}

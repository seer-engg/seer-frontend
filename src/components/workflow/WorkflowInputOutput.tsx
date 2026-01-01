/**
 * WorkflowInputOutput - Displays workflow input and output in side-by-side cards
 */
import { FileInput, FileOutput } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@textea/json-viewer';
import { cn } from '@/lib/utils';
import { extractRelevantContent } from '@/utils/json-viewer-utils';

type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

interface WorkflowInputOutputProps {
  inputs?: Record<string, any> | null;
  output?: Record<string, any> | null;
  status: RunStatus;
  className?: string;
}

export function WorkflowInputOutput({
  inputs,
  output,
  status,
  className,
}: WorkflowInputOutputProps) {
  const hasInputs = !!inputs && Object.keys(inputs).length > 0;
  const hasOutput = !!output && Object.keys(output).length > 0;

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* Input Card */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileInput className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-lg">Input</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasInputs ? (
            <div className="rounded-md border bg-background overflow-auto max-h-[500px]">
              <div className="p-2 text-left [&>*]:text-left">
                <JsonViewer
                  value={extractRelevantContent(inputs)}
                  theme="auto"
                  displayDataTypes={false}
                  displayObjectSize={false}
                  style={{
                    fontSize: '0.75rem',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No input data provided
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg">Output</CardTitle>
              {status === 'running' && (
                <Badge variant="secondary" className="ml-2">
                  Running...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasOutput ? (
            <div className="rounded-md border bg-background overflow-auto max-h-[500px]">
              <div className="p-2 text-left [&>*]:text-left">
                <JsonViewer
                  value={extractRelevantContent(output)}
                  theme="auto"
                  displayDataTypes={false}
                  displayObjectSize={false}
                  style={{
                    fontSize: '0.75rem',
                  }}
                />
              </div>
            </div>
          ) : status === 'running' || status === 'queued' ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Execution in progress...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No output data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


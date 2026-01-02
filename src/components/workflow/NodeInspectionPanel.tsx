/**
 * NodeInspectionPanel - Side panel for inspecting node execution details
 *
 * Shows inputs, outputs, and errors for selected workflow nodes
 */
import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { JsonViewer } from '@textea/json-viewer';
import { extractRelevantContent } from '@/utils/json-viewer-utils';
import { format } from 'date-fns';
import { X, Copy, CheckCircle, XCircle, Wrench, Brain, Code, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface NodeExecutionData {
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

interface NodeInspectionPanelProps {
  node: NodeExecutionData | null;
  open: boolean;
  onClose: () => void;
}

function getNodeTypeIcon(nodeType: string) {
  switch (nodeType) {
    case 'tool':
      return <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    case 'llm':
      return <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    default:
      return <Code className="w-5 h-5 text-muted-foreground" />;
  }
}

export function NodeInspectionPanel({ node, open, onClose }: NodeInspectionPanelProps) {
  const { toast } = useToast();

  const hasInputs = useMemo(() => {
    return !!node?.inputs && Object.keys(node.inputs).length > 0;
  }, [node]);

  const hasOutput = useMemo(() => {
    return node?.output !== undefined;
  }, [node]);

  const hasError = useMemo(() => {
    return !!node?.error;
  }, [node]);

  const status = useMemo(() => {
    if (!node) return null;
    if (node.error) return 'failed';
    if (node.output !== undefined) return 'succeeded';
    return 'running';
  }, [node]);

  const handleCopy = (data: any, label: string) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: `${label} copied successfully`,
    });
  };

  if (!node) return null;

  const nodeDisplayName = node.tool_name || node.model || node.node_id;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">{getNodeTypeIcon(node.node_type)}</div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg">{node.node_id}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap mt-2">
                  <Badge variant="outline">{node.node_type}</Badge>
                  {nodeDisplayName && nodeDisplayName !== node.node_id && (
                    <span className="text-sm text-muted-foreground">
                      {node.node_type === 'tool' ? `tool: ${nodeDisplayName}` : `model: ${nodeDisplayName}`}
                    </span>
                  )}
                  {status && (
                    <div className="flex items-center gap-1">
                      {status === 'succeeded' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      <Badge variant={status === 'succeeded' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                        {status}
                      </Badge>
                    </div>
                  )}
                </SheetDescription>
                {node.timestamp && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Executed: {format(new Date(node.timestamp), 'MMM d, yyyy h:mm:ss a')}
                  </p>
                )}
                {node.output_key && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Output key: <code className="px-1 py-0.5 bg-muted rounded text-xs">{node.output_key}</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6">
          {hasError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Execution Failed</AlertTitle>
              <AlertDescription className="mt-2">
                <pre className="text-sm whitespace-pre-wrap font-mono break-words">
                  {typeof node.error === 'string' ? node.error : JSON.stringify(node.error, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue={hasInputs ? 'inputs' : hasOutput ? 'output' : 'inputs'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inputs" disabled={!hasInputs}>
                Inputs {hasInputs && <Badge variant="secondary" className="ml-2 text-xs">{Object.keys(node.inputs!).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="output" disabled={!hasOutput}>
                Output
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inputs" className="space-y-4">
              {hasInputs ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Input Parameters</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(node.inputs, 'Inputs')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-md border bg-background overflow-auto max-h-[600px]">
                    <div className="p-4 text-left [&>*]:text-left">
                      <JsonViewer
                        value={extractRelevantContent(node.inputs)}
                        theme="auto"
                        displayDataTypes={false}
                        displayObjectSize={false}
                        defaultInspectDepth={2}
                        style={{
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No input data available for this node
                </div>
              )}
            </TabsContent>

            <TabsContent value="output" className="space-y-4">
              {hasOutput ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Output Result
                      {node.output_key && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {node.output_key}
                        </Badge>
                      )}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(node.output, 'Output')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-md border bg-background overflow-auto max-h-[600px]">
                    <div className="p-4 text-left [&>*]:text-left">
                      <JsonViewer
                        value={extractRelevantContent(node.output)}
                        theme="auto"
                        displayDataTypes={false}
                        displayObjectSize={false}
                        defaultInspectDepth={2}
                        style={{
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No output data available for this node
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

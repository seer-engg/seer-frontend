/**
 * Execution Panel Component
 * 
 * Displays workflow execution history and status.
 * Includes input form for executing workflows.
 */
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ExecutionPanelProps {
  workflowId: number;
  compact?: boolean; // If true, show compact version for sidebar
}

interface Workflow {
  id: number;
  name: string;
  graph_data: {
    nodes: Array<{
      id: string;
      type: string;
      data?: {
        label?: string;
        config?: {
          type?: string;
          required?: boolean;
        };
      };
    }>;
  };
}

interface Execution {
  id: number;
  status: 'running' | 'completed' | 'failed';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export function ExecutionPanel({ workflowId, compact = false }: ExecutionPanelProps) {
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [showInputForm, setShowInputForm] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Fetch workflow to get input block schema
  const { data: workflow } = useQuery<Workflow>({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Workflow>(
        `/api/workflows/${workflowId}`,
        { method: 'GET' }
      );
      return response;
    },
  });
  
  // Extract input blocks from workflow
  const inputBlocks = useMemo(() => {
    if (!workflow?.graph_data?.nodes) return [];
    return workflow.graph_data.nodes.filter(
      (node: any) => node.type === 'input'
    );
  }, [workflow]);
  
  // Generate input form fields from input blocks
  const inputFields = useMemo(() => {
    return inputBlocks.map((block: any) => ({
      id: block.id,
      label: block.data?.label || block.id,
      type: block.data?.config?.type || 'text',
      required: block.data?.config?.required !== false,
    }));
  }, [inputBlocks]);
  
  // Execute workflow mutation
  const executeMutation = useMutation({
    mutationFn: async (inputData: Record<string, any>) => {
      return await backendApiClient.request<Execution>(
        `/api/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          body: { input_data: inputData },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', workflowId] });
      setShowInputForm(false);
      setInputData({});
    },
  });
  
  const handleExecute = () => {
    executeMutation.mutate(inputData);
  };
  
  const { data: executions, isLoading, refetch } = useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: async () => {
      const response = await backendApiClient.request<Execution[]>(
        `/api/workflows/${workflowId}/executions`,
        { method: 'GET' }
      );
      return response;
    },
    refetchInterval: 5000, // Poll every 5 seconds for running executions
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Loading executions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Execution</CardTitle>
            <CardDescription>
              Execute workflow and view execution history
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowInputForm(true)}
            disabled={inputFields.length === 0}
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Execute Workflow
          </Button>
        </div>
      </CardHeader>
      
      {showInputForm && inputFields.length > 0 && (
        <CardContent className="border-b">
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleExecute(); 
            }}
            className="space-y-4"
          >
            {inputFields.map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={inputData[field.id] || ''}
                  onChange={(e) => setInputData({
                    ...inputData,
                    [field.id]: e.target.value
                  })}
                  required={field.required}
                  className="mt-1"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={executeMutation.isPending}
                size="sm"
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowInputForm(false);
                  setInputData({});
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      )}
      
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
        <CardDescription>
          View past and current workflow executions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {executions && executions.length > 0 ? (
              executions.map((execution) => (
                <Card 
                  key={execution.id} 
                  className={`p-4 ${compact ? '' : 'cursor-pointer hover:bg-accent transition-colors'}`}
                  onClick={compact ? undefined : () => navigate(`/workflows/${workflowId}/execution/${execution.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className="font-medium">Execution #{execution.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(execution.status)}
                      {!compact && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workflows/${workflowId}/execution/${execution.id}`);
                          }}
                          title="View details"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Started: {format(new Date(execution.started_at), 'PPp')}
                    </div>
                    {execution.completed_at && (
                      <div>
                        Completed: {format(new Date(execution.completed_at), 'PPp')}
                      </div>
                    )}
                  </div>

                  {execution.error_message && (
                    <div className={`mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive ${compact ? 'line-clamp-2' : ''}`}>
                      {execution.error_message}
                    </div>
                  )}

                  {execution.output_data && compact && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-muted-foreground">
                        View Output
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(execution.output_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No executions yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { WorkflowCanvas, WorkflowNodeData } from '@/components/workflows/WorkflowCanvas';
import { ToolPalette } from '@/components/workflows/ToolPalette';
import { BlockConfigPanel } from '@/components/workflows/BlockConfigPanel';
import { WorkflowChatAssistant } from '@/components/workflows/WorkflowChatAssistant';
import { ExecutionPanel } from '@/components/workflows/ExecutionPanel';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { Button } from '@/components/ui/button';
import { Play, Save, Trash2, FileEdit, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Workflows() {
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  
  const {
    workflows,
    isLoading: isLoadingWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    isCreating,
    isExecuting,
    isDeleting,
  } = useWorkflowBuilder();

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleBlockSelect = useCallback(
    (block: { type: string; label: string; config?: any }) => {
      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: block.type as any,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {
          type: block.type as any,
          label: block.label,
          config: block.config || {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    },
    []
  );

  const handleWorkflowGenerated = useCallback(
    (generatedNodes: Node<WorkflowNodeData>[], generatedEdges: Edge[]) => {
      setNodes(generatedNodes);
      setEdges(generatedEdges);
    },
    []
  );

  const handleSave = useCallback(async () => {
    const graphData = { nodes, edges };
    
    try {
      if (selectedWorkflowId) {
        await updateWorkflow(selectedWorkflowId, {
          name: workflowName,
          graph_data: graphData,
        });
      } else {
        const workflow = await createWorkflow(workflowName, undefined, graphData);
        setSelectedWorkflowId(workflow.id);
      }
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  }, [nodes, edges, workflowName, selectedWorkflowId, createWorkflow, updateWorkflow]);

  const handleExecute = useCallback(async () => {
    if (!selectedWorkflowId) {
      alert('Please save the workflow first');
      return;
    }

    try {
      await executeWorkflow(selectedWorkflowId, {}, false);
      alert('Workflow execution started!');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow');
    }
  }, [selectedWorkflowId, executeWorkflow]);

  const handleLoadWorkflow = useCallback((workflow: typeof workflows[0]) => {
    setSelectedWorkflowId(workflow.id);
    setWorkflowName(workflow.name);
    if (workflow.graph_data) {
      setNodes(workflow.graph_data.nodes || []);
      setEdges(workflow.graph_data.edges || []);
    }
  }, []);

  const handleDeleteWorkflow = useCallback(async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    try {
      await deleteWorkflow(workflowId);
      // Clear canvas if the deleted workflow was selected
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId(null);
        setWorkflowName('My Workflow');
        setNodes([]);
        setEdges([]);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('Failed to delete workflow');
    }
  }, [deleteWorkflow, selectedWorkflowId]);

  const handleNewWorkflow = useCallback(() => {
    setSelectedWorkflowId(null);
    setWorkflowName('My Workflow');
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Tool Palette */}
      <div className="w-64 border-r">
        <ToolPalette onBlockSelect={handleBlockSelect} />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="max-w-xs"
              placeholder="Workflow name"
            />
            <Button onClick={handleSave} disabled={isCreating} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleExecute}
              disabled={!selectedWorkflowId || isExecuting}
              size="sm"
              variant="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border flex flex-col">
        {/* Top Panel - Chat Assistant or Block Config */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {selectedNode ? (
            <BlockConfigPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
            />
          ) : (
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <WorkflowChatAssistant
                onWorkflowGenerated={handleWorkflowGenerated}
              />
            </div>
          )}
        </div>

        {/* Saved Workflows Panel */}
        <div className="border-t flex flex-col max-h-72">
          <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saved Workflows</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewWorkflow}
              className="h-7 text-xs"
            >
              + New
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {isLoadingWorkflows ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading workflows...
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No saved workflows yet
                </div>
              ) : (
                workflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className={cn(
                      'cursor-pointer hover:bg-accent/50 transition-colors',
                      selectedWorkflowId === workflow.id && 'ring-2 ring-primary bg-accent/30'
                    )}
                    onClick={() => handleLoadWorkflow(workflow)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {workflow.name}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(workflow.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadWorkflow(workflow);
                            }}
                            title="Edit workflow"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await executeWorkflow(workflow.id, {}, false);
                                alert('Workflow execution started!');
                              } catch (error) {
                                console.error('Failed to execute workflow:', error);
                                alert('Failed to execute workflow');
                              }
                            }}
                            disabled={isExecuting}
                            title="Run workflow"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkflow(workflow.id);
                            }}
                            disabled={isDeleting}
                            title="Delete workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Bottom Panel - Execution History */}
        {selectedWorkflowId && (
          <div className="h-64 border-t">
            <ExecutionPanel workflowId={selectedWorkflowId} />
          </div>
        )}
      </div>
    </div>
  );
}


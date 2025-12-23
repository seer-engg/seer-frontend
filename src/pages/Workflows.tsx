/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { WorkflowCanvas, WorkflowNodeData } from '@/components/workflows/WorkflowCanvas';
import { ToolPalette } from '@/components/workflows/ToolPalette';
import { WorkflowChatAssistant } from '@/components/workflows/WorkflowChatAssistant';
import { BlockConfigPanel } from '@/components/workflows/BlockConfigPanel';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { Button } from '@/components/ui/button';
import { Play, Save, Trash2, FileEdit, Clock, ChevronRight, Bot, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useBackendHealth } from '@/lib/backend-health';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';

export default function Workflows() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [configNode, setConfigNode] = useState<Node<WorkflowNodeData> | null>(null);
  
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
      // Set default config based on block type
      let defaultConfig = block.config || {};
      if (block.type === 'llm') {
        defaultConfig = {
          system_prompt: '',
          model: 'gpt-5-mini',
          temperature: 0.2,
          ...defaultConfig,
        };
      }
      
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
          config: defaultConfig,
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

  const handleConfigureBlock = useCallback((node: Node<WorkflowNodeData>) => {
    // Open the floating configuration panel attached to this node
    setConfigNode(node);
  }, []);

  const handleCloseConfig = useCallback(() => {
    setConfigNode(null);
  }, []);

  const handleConfigUpdate = useCallback((nodeId: string, updates: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
    // Also update the configNode if it's the same node
    setConfigNode((prev) => 
      prev && prev.id === nodeId 
        ? { ...prev, data: { ...prev.data, ...updates } }
        : prev
    );
  }, []);

  // Extract input blocks from current workflow
  const inputBlocks = useMemo(() => {
    return nodes.filter((node) => node.data?.type === 'input');
  }, [nodes]);

  // Generate input fields from input blocks
  const inputFields = useMemo(() => {
    return inputBlocks.map((block) => ({
      id: block.id,
      label: block.data?.label || block.id,
      type: block.data?.config?.type || 'text',
      required: block.data?.config?.required !== false,
      variableName: block.data?.config?.variable_name, // Get variable name if set
    }));
  }, [inputBlocks]);

  const handleExecute = useCallback(async () => {
    if (!selectedWorkflowId) {
      alert('Please save the workflow first');
      return;
    }

    // Check if workflow has input blocks
    if (inputFields.length > 0) {
      // Show input dialog
      setInputData({});
      setShowInputDialog(true);
    } else {
      // No input blocks, execute immediately
      try {
        await executeWorkflow(selectedWorkflowId, {}, false);
        alert('Workflow execution started!');
      } catch (error) {
        console.error('Failed to execute workflow:', error);
        alert('Failed to execute workflow');
      }
    }
  }, [selectedWorkflowId, executeWorkflow, inputFields]);

  const handleExecuteWithInput = useCallback(async () => {
    if (!selectedWorkflowId) return;

    // Transform input data to use variable names if provided
    const transformedInputData: Record<string, any> = {};
    inputFields.forEach((field) => {
      const value = inputData[field.id];
      // Use variable name if set, otherwise use block id
      const key = field.variableName || field.id;
      transformedInputData[key] = value;
    });

    try {
      await executeWorkflow(selectedWorkflowId, transformedInputData, false);
      setShowInputDialog(false);
      setInputData({});
      alert('Workflow execution started!');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow');
    }
  }, [selectedWorkflowId, executeWorkflow, inputData, inputFields]);

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

  const handleApplyChatEdits = useCallback((edits: Array<{
    operation: string;
    block_id?: string;
    block_type?: string;
    config?: Record<string, any>;
    position?: { x: number; y: number };
    source_id?: string;
    target_id?: string;
    source_handle?: string;
    target_handle?: string;
  }>) => {
    // Apply edits to workflow
    let newNodes = [...nodes];
    let newEdges = [...edges];

    for (const edit of edits) {
      if (edit.operation === 'add_block' && edit.block_type) {
        // Add new block
        const newNode: Node<WorkflowNodeData> = {
          id: edit.block_id || `node-${Date.now()}`,
          type: edit.block_type as any,
          position: edit.position || {
            x: Math.random() * 400 + 100,
            y: Math.random() * 400 + 100,
          },
          data: {
            type: edit.block_type as any,
            label: edit.block_type.charAt(0).toUpperCase() + edit.block_type.slice(1),
            config: edit.config || {},
          },
        };
        newNodes.push(newNode);
      } else if (edit.operation === 'modify_block' && edit.block_id) {
        // Modify existing block
        newNodes = newNodes.map((node) =>
          node.id === edit.block_id
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, ...(edit.config || {}) },
                },
              }
            : node
        );
      } else if (edit.operation === 'remove_block' && edit.block_id) {
        // Remove block
        newNodes = newNodes.filter((node) => node.id !== edit.block_id);
        // Also remove connected edges
        newEdges = newEdges.filter(
          (edge) => edge.source !== edit.block_id && edge.target !== edit.block_id
        );
      } else if (edit.operation === 'add_edge' && edit.source_id && edit.target_id) {
        // Add connection
        const newEdge: Edge = {
          id: `edge-${edit.source_id}-${edit.target_id}`,
          source: edit.source_id,
          target: edit.target_id,
          sourceHandle: edit.source_handle,
          targetHandle: edit.target_handle,
        };
        // Check if edge already exists
        if (!newEdges.some((e) => e.source === edit.source_id && e.target === edit.target_id)) {
          newEdges.push(newEdge);
        }
      } else if (edit.operation === 'remove_edge') {
        // Remove connection
        if (edit.source_id && edit.target_id) {
          newEdges = newEdges.filter(
            (edge) => !(edge.source === edit.source_id && edge.target === edit.target_id)
          );
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodes, edges]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('workflowSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleSidebarCollapseChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('workflowSidebarCollapsed', JSON.stringify(collapsed));
  }, []);

  const [chatCollapsed, setChatCollapsed] = useState(() => {
    const saved = localStorage.getItem('workflowChatCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleChatCollapseChange = useCallback((collapsed: boolean) => {
    setChatCollapsed(collapsed);
    localStorage.setItem('workflowChatCollapsed', JSON.stringify(collapsed));
  }, []);

  // Check backend health
  const { isHealthy } = useBackendHealth(10000); // Check every 10 seconds

  // Show toast notifications for backend status changes
  useEffect(() => {
    if (isHealthy === true) {
      toast.success('Backend Connected', {
        description: 'Successfully connected to backend server',
        duration: 3000,
      });
    } else if (isHealthy === false) {
      toast.error('Backend Disconnected', {
        description: 'Unable to connect to backend server',
        duration: 5000,
      });
    }
  }, [isHealthy]);

  return (
    <div className="flex h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - Tool Palette & Saved Workflows */}
        {sidebarCollapsed ? (
          <ResizablePanel defaultSize={0} minSize={0} maxSize={5} className="border-r">
            <div className="w-12 h-full flex flex-col items-center py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSidebarCollapseChange(false)}
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </ResizablePanel>
        ) : (
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={40}
            className="border-r"
          >
            <div className="h-full w-full flex flex-col overflow-hidden">
              <ToolPalette 
                onBlockSelect={handleBlockSelect}
                collapsed={sidebarCollapsed}
                onCollapseChange={handleSidebarCollapseChange}
                workflows={workflows}
                isLoadingWorkflows={isLoadingWorkflows}
                selectedWorkflowId={selectedWorkflowId}
                onLoadWorkflow={handleLoadWorkflow}
                onDeleteWorkflow={handleDeleteWorkflow}
                onExecuteWorkflow={executeWorkflow}
                onNewWorkflow={handleNewWorkflow}
                isExecuting={isExecuting}
              />
            </div>
          </ResizablePanel>
        )}
        
        <ResizableHandle withHandle />

        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col">
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
            {selectedWorkflowId && (
              <Button
                onClick={() => navigate(`/workflows/${selectedWorkflowId}/execution`)}
                size="sm"
                variant="outline"
                title="View execution history and details"
              >
                <Clock className="w-4 h-4 mr-2" />
                Executions
              </Button>
            )}
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            onNodeDoubleClick={(event, node) => {
              handleConfigureBlock(node);
            }}
          />
          
          {/* Floating Configuration Panel */}
          {configNode && (
            <div 
              className="absolute top-4 right-4 w-[400px] max-h-[calc(100%-32px)] bg-card border border-border rounded-lg shadow-xl z-50 flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 rounded-t-lg">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{configNode.data.label}</h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {configNode.data.type.replace('_', ' ')} Block
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCloseConfig}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Panel Content */}
              <ScrollArea className="flex-1 overflow-auto">
                <BlockConfigPanel
                  node={configNode}
                  onUpdate={handleConfigUpdate}
                  allNodes={nodes}
                  autoSave={false}
                />
              </ScrollArea>
            </div>
          )}
        </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />

        {/* Chat Assistant */}
        {chatCollapsed ? (
          <ResizablePanel defaultSize={0} minSize={0} maxSize={5} className="border-l">
            <div className="w-12 h-full flex flex-col items-start py-2 px-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleChatCollapseChange(false)}
                title="Expand chat"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Bot className="w-6 h-6 text-muted-foreground mt-2" />
            </div>
          </ResizablePanel>
        ) : (
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={40} 
            className="border-l"
          >
            <WorkflowChatAssistant
              workflowId={selectedWorkflowId}
              nodes={nodes}
              edges={edges}
              onApplyEdits={handleApplyChatEdits}
              collapsed={chatCollapsed}
              onCollapseChange={handleChatCollapseChange}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>

      {/* Input Dialog */}
      <AlertDialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workflow Input</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide input values for this workflow
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {inputFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={inputData[field.id] || ''}
                  onChange={(e) => setInputData({ ...inputData, [field.id]: e.target.value })}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteWithInput}>
              Run Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Node } from '@xyflow/react';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeData, WorkflowEdge, getNextBranchForSource } from '@/components/workflows/types';
import { BuildAndChatPanel } from '@/components/workflows/BuildAndChatPanel';
import { FloatingWorkflowsPanel } from '@/components/workflows/FloatingWorkflowsPanel';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { Button } from '@/components/ui/button';
import { Clock, Rocket, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useBackendHealth } from '@/lib/backend-health';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';

const isBranchValue = (value: unknown): value is 'true' | 'false' =>
  value === 'true' || value === 'false';

const normalizeEdge = (edge: any): WorkflowEdge => {
  const legacyBranch = edge?.data?.branch ?? edge?.branch;
  const legacyHandle = edge?.targetHandle || edge?.data?.targetHandle;
  const branchCandidate = legacyBranch ?? legacyHandle;
  const branch = isBranchValue(branchCandidate) ? branchCandidate : undefined;

  let normalizedData = edge?.data ? { ...edge.data } : undefined;
  if (branch) {
    normalizedData = { ...(normalizedData || {}), branch };
  }
  if (normalizedData && Object.keys(normalizedData).length === 0) {
    normalizedData = undefined;
  }

  const { sourceHandle: _sourceHandle, targetHandle: _targetHandle, ...rest } = edge || {};

  return {
    ...rest,
    data: normalizedData,
  } as WorkflowEdge;
};

const normalizeEdges = (rawEdges?: any[]): WorkflowEdge[] => {
  if (!Array.isArray(rawEdges)) {
    return [];
  }
  return rawEdges.map((edge) => normalizeEdge(edge));
};

export default function Workflows() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
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


  const handleSave = useCallback(async () => {
    const graphData = { nodes, edges };
    
    try {
      if (selectedWorkflowId) {
        // Update existing workflow
        await updateWorkflow(selectedWorkflowId, {
          name: workflowName,
          graph_data: graphData,
        });
        toast.success('Workflow saved successfully!');
      } else {
        // Fallback: create workflow if somehow we don't have a selectedWorkflowId
        // This shouldn't normally happen since workflows are created on "+ New"
        const workflow = await createWorkflow(workflowName || 'Untitled', undefined, graphData);
        setSelectedWorkflowId(workflow.id);
        toast.success('Workflow created and saved!');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    }
  }, [nodes, edges, workflowName, selectedWorkflowId, createWorkflow, updateWorkflow]);

  // Autosave callback - only saves if workflow already exists
  const autosaveCallback = useCallback(async (data: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[]; workflowName: string }) => {
    if (!selectedWorkflowId) {
      return; // Don't autosave unsaved workflows
    }

    setAutosaveStatus('saving');
    try {
      await updateWorkflow(selectedWorkflowId, {
        name: data.workflowName,
        graph_data: { nodes: data.nodes, edges: data.edges },
      });
      setAutosaveStatus('saved');
      // Reset status after 2 seconds
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Autosave failed:', error);
      setAutosaveStatus('error');
      throw error;
    }
  }, [selectedWorkflowId, updateWorkflow]);

  // Setup autosave hook
  const { triggerSave, resetSavedData } = useDebouncedAutosave({
    data: { nodes, edges, workflowName },
    onSave: autosaveCallback,
    options: {
      delay: 1000,
      enabled: !!selectedWorkflowId && !isLoadingWorkflow,
    },
  });

  // Trigger autosave when nodes, edges, or workflowName change
  useEffect(() => {
    if (selectedWorkflowId && !isLoadingWorkflow) {
      triggerSave();
    }
  }, [nodes, edges, workflowName, selectedWorkflowId, triggerSave, isLoadingWorkflow]);

  // Handle autosave errors
  useEffect(() => {
    if (autosaveStatus === 'error') {
      toast.error('Autosave failed', {
        description: 'Your changes may not have been saved. Please save manually.',
        duration: 5000,
      });
    }
  }, [autosaveStatus]);

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
    setIsLoadingWorkflow(true);
    setSelectedWorkflowId(workflow.id);
    setWorkflowName(workflow.name);
    if (workflow.graph_data) {
      setNodes(workflow.graph_data.nodes || []);
      setEdges(normalizeEdges(workflow.graph_data.edges));
    }
    resetSavedData(); // Reset autosave tracking when loading a workflow
    // Reset loading flag after a brief delay to prevent immediate autosave
    setTimeout(() => setIsLoadingWorkflow(false), 100);
  }, [resetSavedData]);

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
      toast.error('Failed to delete workflow');
    }
  }, [deleteWorkflow, selectedWorkflowId]);

  const handleRenameWorkflow = useCallback(async (workflowId: number, newName: string) => {
    if (!newName.trim()) {
      toast.error('Workflow name cannot be empty');
      return;
    }
    try {
      await updateWorkflow(workflowId, { name: newName.trim() });
      // Update local workflow name if it's the currently selected workflow
      if (selectedWorkflowId === workflowId) {
        setWorkflowName(newName.trim());
      }
      toast.success('Workflow renamed successfully');
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      toast.error('Failed to rename workflow');
      throw error; // Re-throw to allow ToolPalette to handle it
    }
  }, [updateWorkflow, selectedWorkflowId]);

  const handleNewWorkflow = useCallback(async () => {
    try {
      // Create a new workflow immediately with "Untitled" name
      const workflow = await createWorkflow('Untitled', undefined, { nodes: [], edges: [] });
      setSelectedWorkflowId(workflow.id);
      setWorkflowName('Untitled');
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      resetSavedData(); // Reset autosave tracking for new workflow
      // Workflow will appear in list automatically via React Query cache invalidation
    } catch (error) {
      console.error('Failed to create new workflow:', error);
      toast.error('Failed to create new workflow');
      // Fallback to clearing canvas without creating workflow
      setSelectedWorkflowId(null);
      setWorkflowName('My Workflow');
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      resetSavedData();
    }
  }, [createWorkflow, resetSavedData]);

  const handleApplyChatEdits = useCallback((edits: Array<{
    operation: string;
    block_id?: string;
    block_type?: string;
    label?: string;
    config?: Record<string, any>;
    position?: { x: number; y: number };
    source_id?: string;
    target_id?: string;
    branch?: 'true' | 'false';
  }>) => {
    // Apply edits to workflow
    // Process blocks first, then edges to ensure blocks exist when edges are created
    const blockEdits = edits.filter(e => ['add_block', 'modify_block', 'remove_block'].includes(e.operation));
    const edgeEdits = edits.filter(e => ['add_edge', 'remove_edge'].includes(e.operation));
    
    let newNodes = [...nodes];
    let newEdges = [...edges];

    // Process block operations first
    for (const edit of blockEdits) {
      if (edit.operation === 'add_block' && edit.block_type) {
        // Process config: transform inputs to params for tool blocks, handle fields for input blocks
        let processedConfig = edit.config || {};
        
        // Transform inputs to params for tool blocks (backward compatibility)
        if (edit.block_type === 'tool' && processedConfig.inputs && !processedConfig.params) {
          processedConfig = {
            ...processedConfig,
            params: processedConfig.inputs,
          };
          delete processedConfig.inputs;
        }
        
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
            label: edit.label || edit.block_type.charAt(0).toUpperCase() + edit.block_type.slice(1),
            config: processedConfig,
          },
        };
        newNodes.push(newNode);
      } else if (edit.operation === 'modify_block' && edit.block_id) {
        // Transform inputs to params if present
        let processedConfig = edit.config || {};
        if (processedConfig.inputs && !processedConfig.params) {
          processedConfig = {
            ...processedConfig,
            params: processedConfig.inputs,
          };
          delete processedConfig.inputs;
        }
        
        // Modify existing block
        newNodes = newNodes.map((node) =>
          node.id === edit.block_id
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, ...processedConfig },
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
      }
    }

    // Process edge operations after blocks are created
    for (const edit of edgeEdits) {
      if (edit.operation === 'add_edge' && edit.source_id && edit.target_id) {
        const sourceExists = newNodes.some((n) => n.id === edit.source_id);
        const targetExists = newNodes.some((n) => n.id === edit.target_id);

        if (!sourceExists) {
          console.warn(`[handleApplyChatEdits] Source block ${edit.source_id} not found for edge`);
        }
        if (!targetExists) {
          console.warn(`[handleApplyChatEdits] Target block ${edit.target_id} not found for edge`);
        }

        if (sourceExists && targetExists) {
          const normalizedBranch =
            edit.branch === 'true' || edit.branch === 'false'
              ? edit.branch
              : undefined;
          const branch =
            normalizedBranch ||
            getNextBranchForSource(edit.source_id, newNodes, newEdges);

          const newEdge: WorkflowEdge = {
            id: `edge-${edit.source_id}-${edit.target_id}`,
            source: edit.source_id,
            target: edit.target_id,
            data: branch ? { branch } : undefined,
          };

          if (!newEdges.some((e) => e.source === edit.source_id && e.target === edit.target_id)) {
            console.log(`[handleApplyChatEdits] Adding edge from ${edit.source_id} to ${edit.target_id}`);
            newEdges.push(newEdge);
          } else {
            console.log(`[handleApplyChatEdits] Edge from ${edit.source_id} to ${edit.target_id} already exists`);
          }
        }
      } else if (edit.operation === 'remove_edge') {
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

  const [buildChatCollapsed, setBuildChatCollapsed] = useState(() => {
    const saved = localStorage.getItem('buildChatPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleBuildChatCollapseChange = useCallback((collapsed: boolean) => {
    setBuildChatCollapsed(collapsed);
    localStorage.setItem('buildChatPanelCollapsed', JSON.stringify(collapsed));
  }, []);

  // Control SeerSidebar collapse state (synced with SeerLayout via localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('seerSidebarCollapsed');
    return saved ? JSON.parse(saved) : true; // Default to collapsed on workflows page
  });

  const handleSidebarToggle = useCallback(() => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('seerSidebarCollapsed', JSON.stringify(newValue));
    // Dispatch custom event to notify SeerLayout
    window.dispatchEvent(new CustomEvent('seerSidebarToggle', { detail: newValue }));
  }, [sidebarCollapsed]);

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
    <div className="flex flex-col h-screen bg-background">
      {/* Unified Top Bar */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSidebarToggle}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-4 h-4" />
        </Button>
        <div className="flex-1 flex items-center justify-end gap-2">
          <Button
            onClick={handleExecute}
            disabled={!selectedWorkflowId || isExecuting}
            size="sm"
            variant="default"
          >
            <Rocket className="w-4 h-4 mr-2" />
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleBuildChatCollapseChange(!buildChatCollapsed)}
          title={buildChatCollapsed ? "Show Build & Chat panel" : "Hide Build & Chat panel"}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <WorkflowCanvas
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onNodeSelect={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
            />
            
            {/* Floating Workflows Panel */}
            <FloatingWorkflowsPanel
              workflows={workflows}
              isLoadingWorkflows={isLoadingWorkflows}
              selectedWorkflowId={selectedWorkflowId}
              onLoadWorkflow={handleLoadWorkflow}
              onDeleteWorkflow={handleDeleteWorkflow}
              onRenameWorkflow={handleRenameWorkflow}
              onNewWorkflow={handleNewWorkflow}
            />
            
          </div>
        </ResizablePanel>
        
        {/* Build & Chat Panel - Conditionally render to avoid residue width */}
        {!buildChatCollapsed && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={25} 
              minSize={20} 
              maxSize={50} 
              className="border-l"
            >
              <BuildAndChatPanel
                onBlockSelect={handleBlockSelect}
                workflowId={selectedWorkflowId}
                nodes={nodes}
                edges={edges}
                onApplyEdits={handleApplyChatEdits}
                collapsed={buildChatCollapsed}
                onCollapseChange={handleBuildChatCollapseChange}
              />
            </ResizablePanel>
          </>
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


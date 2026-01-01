/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Node } from '@xyflow/react';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeData, WorkflowEdge, FunctionBlockSchema } from '@/components/workflows/types';
import type { WorkflowProposalPreview } from '@/components/workflows/build-and-chat/types';
import { BuildAndChatPanel } from '@/components/workflows/BuildAndChatPanel';
import { FloatingWorkflowsPanel } from '@/components/workflows/FloatingWorkflowsPanel';
import { useWorkflowBuilder, WorkflowListItem, WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { useFunctionBlocks } from '@/hooks/useFunctionBlocks';
import { Button } from '@/components/ui/button';
import { Rocket, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useBackendHealth } from '@/lib/backend-health';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';
import { BUILT_IN_BLOCKS, getBlockIconForType } from '@/components/workflows/build-and-chat/constants';
import { useIntegrationTools } from '@/hooks/useIntegrationTools';
import { WorkflowTriggerModal } from '@/components/workflows/triggers/TriggerModal';

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

const DEFAULT_LLM_USER_PROMPT = 'Enter your prompt here';

const normalizeNodes = (
  rawNodes?: any[],
  functionBlockMap?: Map<string, FunctionBlockSchema>,
): Node<WorkflowNodeData>[] => {
  if (!Array.isArray(rawNodes)) {
    return [];
  }
  return rawNodes.map((node) => {
    const data = node?.data ?? {};
    const position = node?.position ?? { x: 0, y: 0 };
    const resolvedType = (node?.type || data?.type || 'tool') as WorkflowNodeData['type'];
    const configWithDefaults = withDefaultBlockConfig(
      resolvedType,
      data?.config ?? {},
      functionBlockMap,
    );

    return {
      ...node,
      type: resolvedType,
      position,
      data: {
        ...data,
        type: data?.type || resolvedType,
        label: data?.label ?? node?.id ?? '',
        config: configWithDefaults,
      },
    } as Node<WorkflowNodeData>;
  });
};

function withDefaultBlockConfig(
  blockType: string,
  config: Record<string, any> = {},
  functionBlockMap?: Map<string, FunctionBlockSchema>,
): Record<string, any> {
  const schemaDefaults = functionBlockMap?.get(blockType)?.defaults;
  const defaults: Record<string, any> = schemaDefaults ?? (() => {
    switch (blockType) {
      case 'llm':
        return {
          system_prompt: '',
          user_prompt: DEFAULT_LLM_USER_PROMPT,
          model: 'gpt-5-mini',
          temperature: 0.2,
        };
      case 'if_else':
        return {
          condition: '',
        };
      case 'for_loop':
        return {
          array_mode: 'variable',
          array_variable: 'items',
          array_literal: [],
          item_var: 'item',
        };
      case 'input':
        // Only provide defaults if config doesn't have fields OR all fields are empty (no user data)
        // Check if fields have any actual data (non-empty name values)
        const hasValidFields = Array.isArray(config.fields) && config.fields.length > 0 &&
          config.fields.some((f: any) => f.name && f.name.trim() !== '');
        
        if (!hasValidFields) {
          // No valid fields, provide defaults
          return {
            fields: [
              { name: '', displayLabel: '', description: '', type: 'text', required: true, placeholder: '' }
            ]
          };
        }
        // Has valid fields, don't add defaults
        return {};
      default:
        return {};
    }
  })();

  // For input blocks, ALWAYS preserve existing fields array if it has valid data
  if (blockType === 'input') {
    const hasValidFields = Array.isArray(config.fields) && config.fields.length > 0 &&
      config.fields.some((f: any) => f.name && f.name.trim() !== '');
    
    if (hasValidFields) {
      // Explicitly preserve fields array - never overwrite user data
      return {
        ...defaults,
        ...config,
        fields: config.fields, // Explicitly preserve fields array
      };
    }
  }

  return {
    ...defaults,
    ...config,
  };
}

export default function Workflows() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workflowId: urlWorkflowId } = useParams<{ workflowId?: string }>();
  const buildChatSupported = true;
  const { refresh: refreshIntegrationTools } = useIntegrationTools();
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadedWorkflow, setLoadedWorkflow] = useState<WorkflowModel | null>(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [proposalPreview, setProposalPreview] = useState<WorkflowProposalPreview | null>(null);
  
  const {
    workflows,
    isLoading: isLoadingWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getWorkflow,
    isCreating,
    isExecuting,
    isDeleting,
  } = useWorkflowBuilder();
  const {
    blocks: functionBlockSchemas,
    blocksByType: functionBlocksMap,
  } = useFunctionBlocks();

  const availableBlocks = useMemo(() => {
    // Always include built-in blocks (LLM, If/Else, For Loop, Input)
    const builtInBlocksMap = new Map(BUILT_IN_BLOCKS.map(block => [block.type, block]));
    
    // Merge with function blocks from backend, but don't override built-in blocks
    const mergedBlocks = [...BUILT_IN_BLOCKS];
    
    if (functionBlockSchemas.length > 0) {
      functionBlockSchemas.forEach((schema) => {
        // Only add if it's not already a built-in block
        if (!builtInBlocksMap.has(schema.type)) {
          mergedBlocks.push({
            type: schema.type,
            label: schema.label,
            description: schema.description,
            icon: getBlockIconForType(schema.type),
          });
        }
      });
    }
    
    return mergedBlocks;
  }, [functionBlockSchemas]);

  const handleBlockSelect = useCallback(
    (block: { type: string; label: string; config?: any }) => {
      // Set default config based on block type
      const defaultConfig = withDefaultBlockConfig(block.type, block.config, functionBlocksMap);
      
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
    [functionBlocksMap],
  );


  const handleSave = useCallback(async () => {
    const graphData = { nodes, edges };
    
    try {
      if (selectedWorkflowId) {
        const updated = await updateWorkflow(selectedWorkflowId, {
          name: workflowName,
          graph: graphData,
        });
        setLoadedWorkflow(updated);
        toast.success('Workflow saved successfully!');
      } else {
        const workflow = await createWorkflow(workflowName || 'Untitled', undefined, graphData);
        setSelectedWorkflowId(workflow.workflow_id);
        setLoadedWorkflow(workflow);
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
      const updated = await updateWorkflow(selectedWorkflowId, {
        name: data.workflowName,
        graph: { nodes: data.nodes, edges: data.edges },
      });
      setLoadedWorkflow(updated);
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

  const previewGraph = useMemo(() => {
    if (!proposalPreview) {
      return null;
    }
    const previewNodes = normalizeNodes(proposalPreview.graph.nodes ?? [], functionBlocksMap);
    const previewEdges = normalizeEdges(proposalPreview.graph.edges ?? []);
    return { nodes: previewNodes, edges: previewEdges };
  }, [proposalPreview, functionBlocksMap]);

  const isPreviewActive = Boolean(previewGraph);
  const canvasNodes = previewGraph?.nodes ?? nodes;
  const canvasEdges = previewGraph?.edges ?? edges;

  useEffect(() => {
    if (isPreviewActive) {
      setSelectedNodeId(null);
    }
  }, [isPreviewActive]);

  // Extract input blocks from current workflow
  const inputBlocks = useMemo(() => {
    return nodes.filter((node) => node.data?.type === 'input');
  }, [nodes]);

  // Generate input fields from input blocks
  const inputFields = useMemo(() => {
    const fields: Array<{
      id: string;
      label: string;
      type: string;
      required: boolean;
      variableName: string;
    }> = [];

    inputBlocks.forEach((block) => {
      const config = block.data?.config || {};
      
      // New format: fields array
      if (Array.isArray(config.fields)) {
        config.fields.forEach((field: any) => {
          const fieldName = field.name || '';
          if (fieldName) {
            fields.push({
              id: `${block.id}-${fieldName}`,
              label: fieldName,
              type: field.type || 'text',
              required: field.required !== false,
              variableName: fieldName,
            });
          }
        });
      }
      // Legacy format: single variable_name
      else if (config.variable_name) {
        fields.push({
          id: block.id,
          label: block.data?.label || config.variable_name || block.id,
          type: config.type || 'text',
          required: config.required !== false,
          variableName: config.variable_name,
        });
      }
    });

    return fields;
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
        await executeWorkflow(selectedWorkflowId, {});
        alert('Workflow execution started!');
      } catch (error) {
        console.error('Failed to execute workflow:', error);
        alert('Failed to execute workflow');
      }
    }
  }, [selectedWorkflowId, executeWorkflow, inputFields]);

  const handleExecuteWithInput = useCallback(async () => {
    if (!selectedWorkflowId) return;

    // Transform input data to use variable names
    const transformedInputData: Record<string, any> = {};
    inputFields.forEach((field) => {
      const value = inputData[field.id];
      // Use variable name (field name) as the key
      transformedInputData[field.variableName] = value;
    });

    try {
      await executeWorkflow(selectedWorkflowId, transformedInputData);
      setShowInputDialog(false);
      setInputData({});
      alert('Workflow execution started!');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow');
    }
  }, [selectedWorkflowId, executeWorkflow, inputData, inputFields]);

  const handleLoadWorkflow = useCallback(
    async (workflow: WorkflowListItem) => {
      // Navigate to the workflow URL - the useEffect will handle loading
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
    },
    [navigate],
  );

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    try {
      await deleteWorkflow(workflowId);
      // Navigate to /workflows if the deleted workflow was selected
      if (selectedWorkflowId === workflowId) {
        navigate('/workflows', { replace: true });
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  }, [deleteWorkflow, selectedWorkflowId, navigate]);

  const handleRenameWorkflow = useCallback(async (workflowId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('Workflow name cannot be empty');
      return;
    }
    try {
      await updateWorkflow(workflowId, { name: newName.trim() });
      // Update local workflow name if it's the currently selected workflow
      if (selectedWorkflowId === workflowId) {
        setWorkflowName(newName.trim());
        setLoadedWorkflow((prev) =>
          prev ? { ...prev, name: newName.trim() } : prev,
        );
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
      const workflow = await createWorkflow('Untitled', undefined, { nodes: [], edges: [] });
      // Navigate to the new workflow's URL - the useEffect will handle loading
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
      // Workflow will appear in list automatically via React Query cache invalidation
    } catch (error) {
      console.error('Failed to create new workflow:', error);
      toast.error('Failed to create new workflow');
    }
  }, [createWorkflow, navigate]);

  const handleWorkflowGraphSync = useCallback((graph?: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] }) => {
    if (!graph) return;
    setNodes(normalizeNodes(graph.nodes, functionBlocksMap));
    setEdges(normalizeEdges(graph.edges));
    setProposalPreview(null);
  }, [functionBlocksMap]);

  const handleProposalPreviewChange = useCallback((preview: WorkflowProposalPreview | null) => {
    setProposalPreview(preview);
  }, []);

  const [buildChatCollapsed, setBuildChatCollapsed] = useState(() => {
    const saved = localStorage.getItem('buildChatPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleBuildChatCollapseChange = useCallback((collapsed: boolean) => {
    setBuildChatCollapsed(collapsed);
    localStorage.setItem('buildChatPanelCollapsed', JSON.stringify(collapsed));
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

  // Handle OAuth connection redirect - refresh integration status when connected
  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    if (connectedParam) {
      // Refresh integration tools status to reflect new connection
      refreshIntegrationTools();
      
      // Show success toast
      toast.success('Integration Connected', {
        description: `Successfully connected to ${connectedParam}`,
        duration: 3000,
      });
      
      // Remove query parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('connected');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, refreshIntegrationTools, setSearchParams]);

  // Sync URL param with state - load workflow when URL changes
  useEffect(() => {
    // If URL has workflowId but loaded workflow doesn't match, load the workflow
    if (urlWorkflowId && urlWorkflowId !== loadedWorkflow?.workflow_id) {
      const loadWorkflowFromUrl = async () => {
        setIsLoadingWorkflow(true);
        try {
          const fullWorkflow = await getWorkflow(urlWorkflowId);
          setSelectedWorkflowId(fullWorkflow.workflow_id);
          setWorkflowName(fullWorkflow.name);
          setLoadedWorkflow(fullWorkflow);
          setNodes(normalizeNodes(fullWorkflow.graph.nodes, functionBlocksMap));
          setEdges(normalizeEdges(fullWorkflow.graph.edges));
          setProposalPreview(null);
          resetSavedData();
        } catch (error) {
          console.error('Failed to load workflow from URL:', error);
          toast.error('Failed to load workflow', {
            description: 'The workflow may not exist or you may not have access to it.',
          });
          // Redirect to /workflows if workflow doesn't exist
          navigate('/workflows', { replace: true });
        } finally {
          setTimeout(() => setIsLoadingWorkflow(false), 100);
        }
      };
      loadWorkflowFromUrl();
    } else if (!urlWorkflowId && loadedWorkflow) {
      // If URL doesn't have workflowId but we have a loaded workflow, clear the selection
      setSelectedWorkflowId(null);
      setWorkflowName('My Workflow');
      setNodes([]);
      setEdges([]);
      setLoadedWorkflow(null);
      setProposalPreview(null);
      resetSavedData();
    }
  }, [urlWorkflowId, loadedWorkflow?.workflow_id, getWorkflow, functionBlocksMap, resetSavedData, navigate]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <WorkflowCanvas
              initialNodes={canvasNodes}
              initialEdges={canvasEdges}
              onNodesChange={isPreviewActive ? undefined : setNodes}
              onEdgesChange={isPreviewActive ? undefined : setEdges}
              onNodeSelect={isPreviewActive ? undefined : setSelectedNodeId}
              selectedNodeId={isPreviewActive ? null : selectedNodeId}
              readOnly={isPreviewActive}
            />
            {proposalPreview && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-sky-900/90 text-white px-4 py-2 rounded-full shadow-lg max-w-xl text-center">
                  <p className="text-sm font-medium">Previewing workflow proposal</p>
                  <p className="text-xs text-slate-100 line-clamp-2">{proposalPreview.proposal.summary}</p>
                </div>
              </div>
            )}
            
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
        
        {/* Build & Chat Panel - Always render with collapsible behavior */}
        {buildChatSupported && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              key={buildChatCollapsed ? 'collapsed' : 'expanded'}
              defaultSize={buildChatCollapsed ? 3 : 25} 
              minSize={3}
              maxSize={50}
              collapsible
              className="border-l"
            >
              <BuildAndChatPanel
                onBlockSelect={handleBlockSelect}
                workflowId={selectedWorkflowId}
                nodes={nodes}
                edges={edges}
                onWorkflowGraphSync={handleWorkflowGraphSync}
                onProposalPreviewChange={handleProposalPreviewChange}
                activePreviewProposalId={proposalPreview?.proposal.id ?? null}
                collapsed={buildChatCollapsed}
                onCollapseChange={handleBuildChatCollapseChange}
                functionBlocks={availableBlocks}
                onTriggerClick={() => setShowTriggerModal(true)}
                onRunClick={handleExecute}
                isExecuting={isExecuting}
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
      <WorkflowTriggerModal
        open={showTriggerModal}
        onOpenChange={setShowTriggerModal}
        workflowId={selectedWorkflowId}
        workflowName={workflowName}
        workflowInputs={loadedWorkflow?.spec.inputs}
      />
    </div>
  );
}


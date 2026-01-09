/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Node, ReactFlowProvider } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeConfigDialog } from '@/components/workflows/WorkflowNodeConfigDialog';
import { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { TriggerSubscriptionUpdateRequest } from '@/types/triggers';
import type { InputDef } from '@/types/workflow-spec';
import { BuildAndChatPanel } from '@/components/workflows/BuildAndChatPanel';
import { FloatingWorkflowsPanel } from '@/components/workflows/FloatingWorkflowsPanel';
import { WorkflowImportDialog } from '@/components/workflows/WorkflowImportDialog';
import { WorkflowLifecycleBar } from '@/components/workflows/WorkflowLifecycleBar';
import { useWorkflowBuilder, WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { useWorkflowVersions } from '@/hooks/useWorkflowVersions';
import { useWorkflowTriggers } from '@/hooks/useWorkflowTriggers';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { useFunctionBlocks } from '@/hooks/useFunctionBlocks';
import { useBackendHealth } from '@/lib/backend-health';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';
import { backendApiClient } from '@/lib/api-client';
import { BUILT_IN_BLOCKS, getBlockIconForType } from '@/components/workflows/build-and-chat/constants';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { KeymapDialog } from '@/components/KeymapDialog';
import { useIntegrationTools } from '@/hooks/useIntegrationTools';
import { GMAIL_TOOL_FALLBACK_NAMES } from '@/components/workflows/triggers/constants';
import { useCanvasStore, useUIStore } from '@/stores';
import { normalizeEdges, normalizeNodes } from '@/lib/workflow-normalization';
import { useTriggerOptions } from './workflows/hooks/useTriggerOptions';
import { useWorkflowSync } from './workflows/hooks/useWorkflowSync';
import { WorkflowInputDialog } from './workflows/components/WorkflowInputDialog';
import { useNodeConfigUpdate } from './workflows/hooks/useNodeConfigUpdate';
import { useNodeHandlers } from './workflows/hooks/useNodeHandlers';
import { useWorkflowLifecycle } from './workflows/hooks/useWorkflowLifecycle';
import { useWorkflowManagement } from './workflows/hooks/useWorkflowManagement';
import { useTriggerHandlers } from './workflows/hooks/useTriggerHandlers';
import { useWorkflowAutosave } from './workflows/hooks/useWorkflowAutosave';

const parseProviderConnectionId = (raw?: string | null): number | null => {
  if (!raw) {
    return null;
  }
  const segments = raw.split(':');
  const numeric = Number(segments[segments.length - 1]);
  return Number.isNaN(numeric) ? null : numeric;
};

export default function Workflows() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workflowId: urlWorkflowId } = useParams<{ workflowId?: string }>();
  const {
    refresh: refreshIntegrationTools,
    tools: integrationTools,
    isIntegrationConnected,
    getConnectionId,
    connectIntegration,
  } = useIntegrationTools();
  const {
    nodes,
    edges,
    selectedNodeId,
    editingNodeId,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setEditingNodeId,
    autosaveStatus,
    setAutosaveStatus,
  } = useCanvasStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      editingNodeId: state.editingNodeId,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      setSelectedNodeId: state.setSelectedNodeId,
      setEditingNodeId: state.setEditingNodeId,
      autosaveStatus: state.autosaveStatus,
      setAutosaveStatus: state.setAutosaveStatus,
    })),
  );
  const {
    isConfigDialogOpen,
    isImportDialogOpen,
    isKeymapOpen,
    isInputDialogOpen,
    buildChatPanelCollapsed,
    proposalPreview,
    setConfigDialogOpen,
    setImportDialogOpen,
    setKeymapOpen,
    setInputDialogOpen,
    setProposalPreview,
  } = useUIStore(
    useShallow((state) => ({
      isConfigDialogOpen: state.isConfigDialogOpen,
      isImportDialogOpen: state.isImportDialogOpen,
      isKeymapOpen: state.isKeymapOpen,
      isInputDialogOpen: state.isInputDialogOpen,
      buildChatPanelCollapsed: state.buildChatPanelCollapsed,
      proposalPreview: state.proposalPreview,
      setConfigDialogOpen: state.setConfigDialogOpen,
      setImportDialogOpen: state.setImportDialogOpen,
      setKeymapOpen: state.setKeymapOpen,
      setInputDialogOpen: state.setInputDialogOpen,
      setProposalPreview: state.setProposalPreview,
    })),
  );
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [inputData, setInputData] = useState<Record<string, unknown>>({});
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [loadedWorkflow, setLoadedWorkflow] = useState<WorkflowModel | null>(null);
  const editingNode = useMemo(
    () => nodes.find((node) => node.id === editingNodeId) ?? null,
    [nodes, editingNodeId],
  );

  // Register global keyboard shortcut for keymap
  useKeyboardShortcut({
    key: '/',
    modifiers: { ctrl: true, meta: true },
    handler: () => setKeymapOpen(true),
    category: 'Help',
    description: 'Show keyboard shortcuts',
    scope: 'global',
  });

  const {
    workflows,
    isLoading: isLoadingWorkflows,
    createWorkflow,
    updateWorkflowMetadata,
    saveWorkflowDraft,
    deleteWorkflow,
    executeWorkflow,
    publishWorkflow,
    getWorkflow,
    restoreWorkflowVersion,
    exportWorkflow,
    importWorkflow,
    isCreating,
    isExecuting,
    isDeleting,
    isSavingDraft,
    isPublishing,
    isRestoringVersion,
  } = useWorkflowBuilder();

  const {
    versions: workflowVersions,
    isLoading: isLoadingWorkflowVersions,
    invalidate: invalidateWorkflowVersions,
  } = useWorkflowVersions(selectedWorkflowId);
  const {
    blocks: functionBlockSchemas,
    blocksByType: functionBlocksMap,
  } = useFunctionBlocks();
  const {
    triggers: triggerCatalog,
    subscriptions: triggerSubscriptions,
    isLoadingTriggers,
    isLoadingSubscriptions,
    loadTriggerCatalogIfNeeded,
    createSubscription,
    updateSubscription,
    toggleSubscription,
    deleteSubscription,
  } = useWorkflowTriggers(selectedWorkflowId);

  const availableBlocks = useMemo(() => {
    // Always include built-in blocks (LLM, If/Else, For Loop)
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

  const workflowInputsDef = useMemo(() => loadedWorkflow?.spec?.inputs ?? {}, [loadedWorkflow?.spec?.inputs]);
  const handleWorkflowInputsChange = useCallback(
    async (nextInputs: Record<string, InputDef>) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        toast.error('Save the workflow before editing inputs');
        return;
      }
      try {
        await backendApiClient.request(`/api/v1/workflows/${selectedWorkflowId}/draft`, {
          method: 'PATCH',
          body: {
            base_revision: loadedWorkflow.draft_revision,
            spec: {
              ...loadedWorkflow.spec,
              inputs: nextInputs,
            },
          },
        });
        const refreshed = await getWorkflow(selectedWorkflowId);
        setLoadedWorkflow(refreshed);
        setNodes(normalizeNodes(refreshed.graph.nodes, functionBlocksMap));
        setEdges(normalizeEdges(refreshed.graph.edges));
      } catch (error) {
        console.error('Failed to update workflow inputs', error);
        toast.error('Unable to update workflow inputs');
        throw error;
      }
    },
    [selectedWorkflowId, loadedWorkflow, getWorkflow, functionBlocksMap, setNodes, setEdges],
  );
  const gmailToolNames = useMemo(() => {
    const normalized = Array.isArray(integrationTools) ? integrationTools : [];
    const names = normalized
      .filter((tool) => {
        const integration = tool.integration_type?.toLowerCase();
        if (integration) {
          return integration === 'gmail';
        }
        return tool.name.toLowerCase().includes('gmail');
      })
      .map((tool) => tool.name);
    return names.length > 0 ? names : GMAIL_TOOL_FALLBACK_NAMES;
  }, [integrationTools]);
  const gmailConnectionIdRaw = getConnectionId('gmail');
  const gmailConnectionId = useMemo(
    () => parseProviderConnectionId(gmailConnectionIdRaw),
    [gmailConnectionIdRaw],
  );
  const gmailIntegrationReady = isIntegrationConnected('gmail') && typeof gmailConnectionId === 'number';

  // Trigger handlers hook
  const triggerHandlersHook = useTriggerHandlers({
    selectedWorkflowId,
    triggerCatalog,
    workflowInputsDef,
    gmailIntegrationReady,
    gmailConnectionId,
    createSubscription,
    connectIntegration,
    gmailToolNames,
  });
  const { draftTriggers, isConnectingGmail, handleAddTriggerDraft, handleSaveTriggerDraft, handleDiscardTriggerDraft, handleConnectGmail } = triggerHandlersHook;

  // Input fields for workflow execution
  const inputFields = useMemo(() => {
    const resolveHtmlInputType = (inputType: InputDef['type']): string => {
      if (inputType === 'number' || inputType === 'integer') {
        return 'number';
      }
      return 'text';
    };
    return Object.entries(workflowInputsDef).map(([name, def]) => ({
      id: name,
      label: def.description || name,
      type: resolveHtmlInputType(def.type),
      required: def.required !== false,
      variableName: name,
    }));
  }, [workflowInputsDef]);

  // Workflow lifecycle hook
  const resetSavedDataRef = useRef<(() => void) | undefined>();
  const lifecycle = useWorkflowLifecycle({
    selectedWorkflowId,
    loadedWorkflow,
    nodes,
    edges,
    workflowName,
    workflowInputsDef,
    inputFields,
    inputData,
    functionBlocksMap,
    createWorkflow,
    saveWorkflowDraft,
    executeWorkflow,
    publishWorkflow,
    restoreWorkflowVersion,
    getWorkflow,
    setSelectedWorkflowId,
    setLoadedWorkflow,
    setWorkflowName,
    setNodes,
    setEdges,
    setInputDialogOpen,
    setInputData,
    invalidateWorkflowVersions,
    resetSavedDataRef,
  });

  const { autosaveCallback } = useWorkflowAutosave({
    selectedWorkflowId,
    loadedWorkflow,
    functionBlocksMap,
    saveWorkflowDraft,
    getWorkflow,
    setLoadedWorkflow,
    setNodes,
    setEdges,
    setAutosaveStatus,
    setLastRunVersionId: lifecycle.setLastRunVersionId,
    invalidateWorkflowVersions,
    resetSavedDataRef,
  });

  // Setup autosave hook
  const { triggerSave, resetSavedData } = useDebouncedAutosave({
    data: { nodes, edges },
    onSave: autosaveCallback,
    options: {
      delay: 1000,
      enabled: !!selectedWorkflowId && !isLoadingWorkflow,
    },
  });

  // Node config update hook
  const nodeConfigUpdate = useNodeConfigUpdate({
    selectedWorkflowId,
    loadedWorkflow,
    setNodes,
    autosaveCallback,
    triggerSave,
  });
  const { handleNodeConfigUpdate, skipNextAutosaveRef } = nodeConfigUpdate;

  // Node handlers hook
  const nodeHandlers = useNodeHandlers({
    setNodes,
    setSelectedNodeId,
    setEditingNodeId,
    setConfigDialogOpen,
    functionBlocksMap,
    triggerCatalog,
    workflowInputsDef,
    gmailIntegrationReady,
    gmailConnectionId,
    handleConnectGmail,
    isConnectingGmail,
  });

  useEffect(() => {
    resetSavedDataRef.current = resetSavedData;
  }, [resetSavedData]);

  // Trigger autosave when nodes or edges change
  useEffect(() => {
    if (!selectedWorkflowId || isLoadingWorkflow) {
      return;
    }
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    triggerSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, selectedWorkflowId, triggerSave, isLoadingWorkflow]);

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
  
  const triggerHandlers = useMemo(
    () => ({
      update: (subscriptionId: number, payload: TriggerSubscriptionUpdateRequest) =>
        updateSubscription(subscriptionId, payload).then(() => undefined),
      toggle: (subscriptionId: number, enabled: boolean) =>
        toggleSubscription({ subscriptionId, enabled }).then(() => undefined),
      delete: (subscriptionId: number) => deleteSubscription(subscriptionId).then(() => undefined),
      saveDraft: handleSaveTriggerDraft,
      discardDraft: handleDiscardTriggerDraft,
      updateWorkflowInputs: (inputs: Record<string, InputDef>) => handleWorkflowInputsChange(inputs),
    }),
    [
      updateSubscription,
      toggleSubscription,
      deleteSubscription,
      handleSaveTriggerDraft,
      handleDiscardTriggerDraft,
      handleWorkflowInputsChange,
    ],
  );

  // Populate handlers for trigger nodes that don't have them
  useEffect(() => {
    const hasUnpopulatedTriggerNodes = nodes.some(
      node => node.type === 'trigger' && node.data.triggerMeta && (!node.data.triggerMeta.handlers || Object.keys(node.data.triggerMeta.handlers).length === 0)
    );
    
    if (hasUnpopulatedTriggerNodes) {
      const updatedNodes = nodes.map(node => {
        if (node.type === 'trigger' && node.data.triggerMeta && (!node.data.triggerMeta.handlers || Object.keys(node.data.triggerMeta.handlers).length === 0)) {
          return {
            ...node,
            data: {
              ...node.data,
              triggerMeta: {
                ...node.data.triggerMeta,
                handlers: triggerHandlers
              }
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, triggerHandlers, setNodes]); // Only react to changes in number of nodes

  // Workflow management hook
  const management = useWorkflowManagement({
    selectedWorkflowId,
    loadedWorkflow,
    deleteWorkflow,
    updateWorkflowMetadata,
    exportWorkflow,
    importWorkflow,
    createWorkflow,
    navigate,
    setWorkflowName,
    setLoadedWorkflow,
  });

  const handleWorkflowGraphSync = useCallback(
    (graph?: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] }) => {
      if (!graph) return;
      setNodes(normalizeNodes(graph.nodes, functionBlocksMap));
      setEdges(normalizeEdges(graph.edges));
      setProposalPreview(null);
      lifecycle.setLastRunVersionId(null);
    },
    [functionBlocksMap, setNodes, setEdges, setProposalPreview, lifecycle],
  );

  const triggerOptions = useTriggerOptions({
    triggerCatalog,
    gmailIntegrationReady,
    isConnectingGmail,
    onAddTriggerDraft: handleAddTriggerDraft,
    onConnectGmail: handleConnectGmail,
  });

  useEffect(() => {
    if (isPreviewActive) {
      setSelectedNodeId(null);
    }
  }, [isPreviewActive, setSelectedNodeId]);

  // Load trigger catalog when Build panel is expanded
  useEffect(() => {
    if (!buildChatPanelCollapsed) {
      loadTriggerCatalogIfNeeded();
    }
  }, [buildChatPanelCollapsed, loadTriggerCatalogIfNeeded]);

  useEffect(() => {
    if (!editingNodeId) {
      return;
    }
    const exists = nodes.some((node) => node.id === editingNodeId);
    if (!exists) {
      setEditingNodeId(null);
      setConfigDialogOpen(false);
    }
  }, [editingNodeId, nodes, setConfigDialogOpen, setEditingNodeId]);

  // Workflow URL sync
  useWorkflowSync({
    urlWorkflowId,
    loadedWorkflow,
    functionBlocksMap,
    getWorkflow,
    setSelectedWorkflowId,
    setWorkflowName,
    setLoadedWorkflow,
    setNodes,
    setEdges,
    setProposalPreview,
    setLastRunVersionId: lifecycle.setLastRunVersionId,
    setIsLoadingWorkflow,
  });

  // Check backend health
  const { isHealthy } = useBackendHealth(); // check backend health

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

  return (
    <div className="flex flex-col h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
          {/* Canvas */}
          <ReactFlowProvider>
            <div className="flex-1 relative overflow-hidden">
              <WorkflowCanvas
              key={selectedWorkflowId ?? 'new'}
                triggerNodes={[]}
                previewGraph={previewGraph}
              onNodeDoubleClick={isPreviewActive ? undefined : nodeHandlers.handleCanvasNodeDoubleClick}
              onNodeDrop={isPreviewActive ? undefined : nodeHandlers.handleNodeDrop}
              readOnly={isPreviewActive}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none">
              <div className="pointer-events-auto">
                <WorkflowLifecycleBar
                  lifecycleStatus={lifecycle.lifecycleStatus}
                  onRunClick={lifecycle.handleExecute}
                  onPublishClick={lifecycle.handlePublish}
                  isExecuting={isExecuting}
                  isPublishing={isPublishing}
                isRestoringVersion={isRestoringVersion}
                  canRun={lifecycle.canRun}
                  canPublish={lifecycle.canPublish}
                  publishDisabledReason={lifecycle.publishDisabledReason}
                  runDisabledReason={lifecycle.runDisabledReason}
                versionOptions={workflowVersions}
                isVersionsLoading={isLoadingWorkflowVersions}
                onVersionRestore={lifecycle.handleRestoreVersion}
                versionRestoreDisabledReason={
                  selectedWorkflowId ? undefined : 'Save the workflow before restoring versions'
                }
                />
              </div>
              {proposalPreview && (
                <div className="pointer-events-auto">
                  <div className="bg-sky-900/90 text-white px-4 py-2 rounded-full shadow-lg max-w-xl text-center">
                    <p className="text-sm font-medium">Previewing workflow proposal</p>
                    <p className="text-xs text-slate-100 line-clamp-2">
                      {proposalPreview.proposal.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Floating Workflows Panel */}
            <FloatingWorkflowsPanel
              workflows={workflows}
              isLoadingWorkflows={isLoadingWorkflows}
              selectedWorkflowId={selectedWorkflowId}
              onLoadWorkflow={management.handleLoadWorkflow}
              onDeleteWorkflow={management.handleDeleteWorkflow}
              onRenameWorkflow={management.handleRenameWorkflow}
              onNewWorkflow={management.handleNewWorkflow}
              onExportWorkflow={management.handleExportWorkflow}
              onImportWorkflow={() => setImportDialogOpen(true)}
            />

            {/* Workflow Import Dialog */}
            <WorkflowImportDialog
              open={isImportDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={management.handleImportWorkflow}
            />
            
            </div>
          </ReactFlowProvider>
        </ResizablePanel>
        
        {/* Build & Chat Panel - Always render with collapsible behavior */}

          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              key={buildChatPanelCollapsed ? 'collapsed' : 'expanded'}
              defaultSize={buildChatPanelCollapsed ? 3 : 25} 
              minSize={3}
              maxSize={50}
              collapsible
              className="border-l"
            >
              <BuildAndChatPanel
                onBlockSelect={nodeHandlers.handleBlockSelect}
                workflowId={selectedWorkflowId}
                onWorkflowGraphSync={handleWorkflowGraphSync}
                functionBlocks={availableBlocks}
                triggerOptions={triggerOptions}
                isLoadingTriggers={isLoadingTriggers || isLoadingSubscriptions}
                triggerInfoMessage={undefined}
              />
            </ResizablePanel>
          </>
      </ResizablePanelGroup>

      <WorkflowNodeConfigDialog
        open={isConfigDialogOpen}
        node={editingNode}
        allNodes={nodes}
        allEdges={edges}
        onOpenChange={nodeHandlers.handleConfigDialogOpenChange}
        onUpdate={handleNodeConfigUpdate}
        workflowInputs={workflowInputsDef}
      />

      {/* Input Dialog */}
      <WorkflowInputDialog
        open={isInputDialogOpen}
        onOpenChange={setInputDialogOpen}
        inputFields={inputFields}
        inputData={inputData}
        onInputDataChange={setInputData}
        onExecute={lifecycle.handleExecuteWithInput}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeymapDialog open={isKeymapOpen} onOpenChange={setKeymapOpen} />
    </div>
  );
}


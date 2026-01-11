import { useCallback, useMemo, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { TriggerSubscriptionUpdateRequest } from '@/types/triggers';
import type { InputDef } from '@/types/workflow-spec';
import { BuildAndChatPanel } from '@/components/workflows/panels/BuildAndChatPanel';
import { WorkflowCanvasSection } from '@/components/workflows/layout/WorkflowCanvasSection';
import { WorkflowDialogs } from '@/components/workflows/layout/WorkflowDialogs';
import { useWorkflowVersions } from '@/hooks/useWorkflowVersions';
import { useWorkflowTriggers } from '@/hooks/useWorkflowTriggers';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useKeyboardShortcut } from '@/hooks/utility/useKeyboardShortcuts';
import { normalizeEdges, normalizeNodes } from '@/lib/workflow-normalization';
import { useTriggerOptions } from '@/hooks/useTriggerOptions';
import { useWorkflowSync } from '@/hooks/useWorkflowSync';
import { useWorkflowActions } from '@/hooks/useWorkflowActions';
import { useNodeActions } from '@/hooks/useNodeActions';
import { useTriggerHandlers } from '@/hooks/useTriggerHandlers';
import { useWorkflowInputs } from '@/hooks/useWorkflowInputs';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useBackendConnectionEffects } from '@/hooks/useBackendConnectionEffects';
import { useWorkflowPageState } from '@/hooks/useWorkflowPageState';
import { useWorkflowLifecycleEffects } from '@/hooks/useWorkflowLifecycleEffects';
import { useWorkflowBlocks } from '@/hooks/useWorkflowBlocks';

interface WorkflowHooksParams {
  selectedWorkflowId: string;
  functionBlockSchemas: Record<string, unknown>;
  functionBlocksMap: Record<string, unknown>;
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setProposalPreview: (preview: unknown) => void;
}

function useWorkflowHooks({
  selectedWorkflowId,
  functionBlockSchemas,
  functionBlocksMap,
  setNodes,
  setEdges,
  setProposalPreview,
}: WorkflowHooksParams) {
  const {
    versions: workflowVersions,
    isLoading: isLoadingWorkflowVersions,
  } = useWorkflowVersions(selectedWorkflowId);
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
  const { availableBlocks, handleWorkflowGraphSync } = useWorkflowBlocks({
    functionBlockSchemas,
    functionBlocksMap,
    setNodes,
    setEdges,
    setProposalPreview,
    setLastRunVersionId: () => {},
  });

  return {
    workflowVersions,
    isLoadingWorkflowVersions,
    triggerCatalog,
    triggerSubscriptions,
    isLoadingTriggers,
    isLoadingSubscriptions,
    loadTriggerCatalogIfNeeded,
    createSubscription,
    updateSubscription,
    toggleSubscription,
    deleteSubscription,
    availableBlocks,
    handleWorkflowGraphSync,
  };
}

function useWorkflowInitialization() {
  const { workflowInputsDef, handleWorkflowInputsChange, inputFields } = useWorkflowInputs();
  const { gmailToolNames, gmailConnectionId, gmailIntegrationReady } = useGmailIntegration();
  useBackendConnectionEffects();

  return {
    workflowInputsDef,
    handleWorkflowInputsChange,
    inputFields,
    gmailToolNames,
    gmailConnectionId,
    gmailIntegrationReady,
  };
}

function CanvasSection({ canvasProps }: { canvasProps: Record<string, unknown> }) {
  return (
    <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
      <WorkflowCanvasSection {...canvasProps} />
    </ResizablePanel>
  );
}

function ChatPanel({ chatProps }: { chatProps: Record<string, unknown> & { buildChatPanelCollapsed: boolean } }) {
  const { buildChatPanelCollapsed, ...rest } = chatProps;
  return (
    <ResizablePanel
      key={buildChatPanelCollapsed ? 'collapsed' : 'expanded'}
      defaultSize={buildChatPanelCollapsed ? 3 : 25}
      minSize={3}
      maxSize={50}
      collapsible
      className="border-l"
    >
      <BuildAndChatPanel {...rest} />
    </ResizablePanel>
  );
}

interface PreviewGraphData {
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
}

interface ProposalPreviewData {
  graph?: {
    nodes?: unknown[];
    edges?: unknown[];
  };
}

function usePreviewGraph(proposalPreview: unknown, functionBlocksMap: Record<string, unknown>): PreviewGraphData | null {
  return useMemo(() => {
    if (!proposalPreview) return null;
    const preview = proposalPreview as ProposalPreviewData;
    const previewNodes = normalizeNodes(preview.graph?.nodes ?? [], functionBlocksMap);
    const previewEdges = normalizeEdges(preview.graph?.edges ?? []);
    return { nodes: previewNodes, edges: previewEdges };
  }, [proposalPreview, functionBlocksMap]);
}

interface TriggerHandlersConfigParams {
  updateSubscription: (id: number, payload: TriggerSubscriptionUpdateRequest) => Promise<unknown>;
  toggleSubscription: (config: { subscriptionId: number; enabled: boolean }) => Promise<unknown>;
  deleteSubscription: (id: number) => Promise<unknown>;
  handleSaveTriggerDraft: (draft: unknown) => void;
  handleDiscardTriggerDraft: () => void;
  handleWorkflowInputsChange: (inputs: Record<string, InputDef>) => void;
}

function useTriggerHandlersConfig({
  updateSubscription,
  toggleSubscription,
  deleteSubscription,
  handleSaveTriggerDraft,
  handleDiscardTriggerDraft,
  handleWorkflowInputsChange,
}: TriggerHandlersConfigParams) {
  return useMemo(
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
    [updateSubscription, toggleSubscription, deleteSubscription, handleSaveTriggerDraft, handleDiscardTriggerDraft, handleWorkflowInputsChange],
  );
}

function buildCanvasProps(params: {
  selectedWorkflowId: string; previewGraph: PreviewGraphData | null; proposalPreview: unknown;
  lifecycleStatus: unknown; workflows: unknown[]; isLoadingWorkflows: boolean;
  workflowVersions: unknown[]; isLoadingWorkflowVersions: boolean; isExecuting: boolean;
  isPublishing: boolean; isRestoringVersion: boolean; canRun: boolean; canPublish: boolean;
  publishDisabledReason: string; runDisabledReason: string; isImportDialogOpen: boolean;
  handleCanvasNodeDoubleClick: (id: string) => void; handleNodeDrop: (e: unknown) => void;
  handleExecute: (fields: unknown) => void; handlePublish: () => void; handleRestoreVersion: (versionId: string) => void;
  handleLoadWorkflow: (id: string) => void; handleDeleteWorkflow: (id: string) => void;
  handleRenameWorkflow: (id: string, name: string) => void; handleNewWorkflow: () => void;
  handleExportWorkflow: (id: string) => void; setImportDialogOpen: (open: boolean) => void;
  handleImportWorkflow: (file: File) => void; inputFields: unknown;
}) {
  const {
    selectedWorkflowId, previewGraph, proposalPreview, lifecycleStatus, workflows, isLoadingWorkflows,
    workflowVersions, isLoadingWorkflowVersions, isExecuting, isPublishing, isRestoringVersion,
    canRun, canPublish, publishDisabledReason, runDisabledReason, isImportDialogOpen,
    handleCanvasNodeDoubleClick, handleNodeDrop, handleExecute, handlePublish, handleRestoreVersion,
    handleLoadWorkflow, handleDeleteWorkflow, handleRenameWorkflow, handleNewWorkflow, handleExportWorkflow,
    setImportDialogOpen, handleImportWorkflow, inputFields,
  } = params;
  return {
    selectedWorkflowId, previewGraph, proposalPreview, lifecycleStatus, workflows, isLoadingWorkflows,
    workflowVersions, isLoadingWorkflowVersions, isExecuting, isPublishing, isRestoringVersion,
    canRun, canPublish, publishDisabledReason, runDisabledReason, isImportDialogOpen,
    onNodeDoubleClick: handleCanvasNodeDoubleClick, onNodeDrop: handleNodeDrop,
    onRunClick: () => handleExecute(inputFields), onPublishClick: handlePublish,
    onVersionRestore: handleRestoreVersion, onLoadWorkflow: handleLoadWorkflow,
    onDeleteWorkflow: handleDeleteWorkflow, onRenameWorkflow: handleRenameWorkflow,
    onNewWorkflow: handleNewWorkflow, onExportWorkflow: handleExportWorkflow,
    onImportDialogOpen: () => setImportDialogOpen(true), onImportWorkflow: handleImportWorkflow,
    setImportDialogOpen,
  };
}

function buildChatProps(params: {
  buildChatPanelCollapsed: boolean; handleBlockSelect: (id: string) => void; selectedWorkflowId: string;
  handleWorkflowGraphSync: (graph: unknown) => void; availableBlocks: unknown[]; triggerOptions: unknown;
  isLoadingTriggers: boolean;
}) {
  return {
    buildChatPanelCollapsed: params.buildChatPanelCollapsed,
    onBlockSelect: params.handleBlockSelect, workflowId: params.selectedWorkflowId,
    onWorkflowGraphSync: params.handleWorkflowGraphSync, functionBlocks: params.availableBlocks,
    triggerOptions: params.triggerOptions, isLoadingTriggers: params.isLoadingTriggers, triggerInfoMessage: undefined,
  };
}

export default function Workflows() {
  const state = useWorkflowPageState();
  const {
    urlWorkflowId, nodes, edges, editingNodeId, setNodes, setEdges, setSelectedNodeId,
    setEditingNodeId, autosaveStatus, isConfigDialogOpen, isImportDialogOpen, isKeymapOpen,
    isInputDialogOpen, buildChatPanelCollapsed, proposalPreview, setConfigDialogOpen,
    setImportDialogOpen, setKeymapOpen, setInputDialogOpen, setProposalPreview, setWorkflowName,
    selectedWorkflowId, setSelectedWorkflowId, inputData, setInputData, isLoadingWorkflow,
    setIsLoadingWorkflow, loadedWorkflow, workflows, isLoadingWorkflows, getWorkflow,
    isExecuting, isPublishing, isRestoringVersion, functionBlockSchemas, functionBlocksMap, editingNode,
  } = state;

  useKeyboardShortcut({
    key: '/', modifiers: { ctrl: true, meta: true }, handler: () => setKeymapOpen(true),
    category: 'Help', description: 'Show keyboard shortcuts', scope: 'global',
  });

  const { workflowInputsDef, handleWorkflowInputsChange, inputFields, gmailToolNames, gmailConnectionId, gmailIntegrationReady } = useWorkflowInitialization();

  const {
    handleSave, handleExecute, handleExecuteWithInput, handlePublish, handleRestoreVersion,
    handleNewWorkflow, handleLoadWorkflow, handleDeleteWorkflow, handleRenameWorkflow,
    handleExportWorkflow, handleImportWorkflow, autosaveCallback, lifecycleStatus,
    lastRunVersionId, setLastRunVersionId, canRun, canPublish, runDisabledReason,
    publishDisabledReason, resetSavedDataRef,
  } = useWorkflowActions();

  const { triggerSave, resetSavedData } = useDebouncedAutosave({
    data: { nodes, edges },
    onSave: autosaveCallback,
    options: { delay: 1000, enabled: !!selectedWorkflowId && !isLoadingWorkflow },
  });

  const { isConnectingGmail, handleAddTriggerDraft, handleSaveTriggerDraft, handleDiscardTriggerDraft, handleConnectGmail } = useTriggerHandlers({
    gmailIntegrationReady, gmailConnectionId, gmailToolNames, createSubscription: () => Promise.resolve(),
  });

  const {
    handleBlockSelect, handleNodeDrop, handleCanvasNodeDoubleClick, handleConfigDialogOpenChange,
    handleNodeConfigUpdate, skipNextAutosaveRef,
  } = useNodeActions({
    autosaveCallback, triggerSave, gmailIntegrationReady, gmailConnectionId,
    handleConnectGmail, isConnectingGmail,
  });

  useEffect(() => {
    resetSavedDataRef.current = resetSavedData;
  }, [resetSavedData, resetSavedDataRef]);

  const {
    workflowVersions, isLoadingWorkflowVersions, triggerCatalog, isLoadingTriggers,
    isLoadingSubscriptions, loadTriggerCatalogIfNeeded, updateSubscription, toggleSubscription,
    deleteSubscription, availableBlocks, handleWorkflowGraphSync,
  } = useWorkflowHooks({
    selectedWorkflowId, functionBlockSchemas, functionBlocksMap, setNodes, setEdges, setProposalPreview,
  });

  const previewGraph = usePreviewGraph(proposalPreview, functionBlocksMap);
  const isPreviewActive = Boolean(previewGraph);

  const triggerHandlers = useTriggerHandlersConfig({
    updateSubscription, toggleSubscription, deleteSubscription, handleSaveTriggerDraft,
    handleDiscardTriggerDraft, handleWorkflowInputsChange,
  });

  useWorkflowLifecycleEffects({
    autosaveStatus, nodes, edges, selectedWorkflowId, isLoadingWorkflow, editingNodeId,
    isPreviewActive, buildChatPanelCollapsed, triggerSave, setNodes, setSelectedNodeId,
    setEditingNodeId, setConfigDialogOpen, loadTriggerCatalogIfNeeded, triggerHandlers, skipNextAutosaveRef,
  });

  const triggerOptions = useTriggerOptions({
    triggerCatalog, gmailIntegrationReady, isConnectingGmail,
    onAddTriggerDraft: handleAddTriggerDraft, onConnectGmail: handleConnectGmail,
  });

  useWorkflowSync({
    urlWorkflowId, loadedWorkflow, functionBlocksMap, getWorkflow, setSelectedWorkflowId,
    setWorkflowName, setNodes, setEdges, setProposalPreview, setLastRunVersionId, setIsLoadingWorkflow,
  });

  const canvasProps = buildCanvasProps({
    selectedWorkflowId, previewGraph, proposalPreview, lifecycleStatus, workflows, isLoadingWorkflows,
    workflowVersions, isLoadingWorkflowVersions, isExecuting, isPublishing, isRestoringVersion,
    canRun, canPublish, publishDisabledReason, runDisabledReason, isImportDialogOpen,
    handleCanvasNodeDoubleClick, handleNodeDrop, handleExecute, handlePublish, handleRestoreVersion,
    handleLoadWorkflow, handleDeleteWorkflow, handleRenameWorkflow, handleNewWorkflow, handleExportWorkflow,
    setImportDialogOpen, handleImportWorkflow, inputFields,
  });

  const chatProps = buildChatProps({
    buildChatPanelCollapsed, handleBlockSelect, selectedWorkflowId, handleWorkflowGraphSync,
    availableBlocks, triggerOptions, isLoadingTriggers: isLoadingTriggers || isLoadingSubscriptions,
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <CanvasSection canvasProps={canvasProps} />
        <ResizableHandle withHandle />
        <ChatPanel chatProps={chatProps} />
      </ResizablePanelGroup>
      <WorkflowDialogs
        isConfigDialogOpen={isConfigDialogOpen} isInputDialogOpen={isInputDialogOpen} isKeymapOpen={isKeymapOpen}
        editingNode={editingNode} allNodes={nodes} allEdges={edges} workflowInputsDef={workflowInputsDef}
        inputFields={inputFields} inputData={inputData} onConfigDialogOpenChange={handleConfigDialogOpenChange}
        onNodeConfigUpdate={handleNodeConfigUpdate} setInputDialogOpen={setInputDialogOpen}
        setInputData={setInputData} setKeymapOpen={setKeymapOpen}
        onExecuteWithInput={() => handleExecuteWithInput(inputFields, inputData)}
      />
    </div>
  );
}


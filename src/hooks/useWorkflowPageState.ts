import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCanvasStore, useUIStore, useWorkflowStore } from '@/stores';
import { useToolsStore } from '@/stores/toolsStore';

export function useWorkflowPageState() {
  const { workflowId: urlWorkflowId } = useParams<{ workflowId?: string }>();

  // Canvas state
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const editingNodeId = useCanvasStore((state) => state.editingNodeId);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId);
  const setEditingNodeId = useCanvasStore((state) => state.setEditingNodeId);
  const autosaveStatus = useCanvasStore((state) => state.autosaveStatus);

  // UI state
  const isConfigDialogOpen = useUIStore((state) => state.isConfigDialogOpen);
  const isImportDialogOpen = useUIStore((state) => state.isImportDialogOpen);
  const isKeymapOpen = useUIStore((state) => state.isKeymapOpen);
  const isInputDialogOpen = useUIStore((state) => state.isInputDialogOpen);
  const buildChatPanelCollapsed = useUIStore((state) => state.buildChatPanelCollapsed);
  const proposalPreview = useUIStore((state) => state.proposalPreview);
  const setConfigDialogOpen = useUIStore((state) => state.setConfigDialogOpen);
  const setImportDialogOpen = useUIStore((state) => state.setImportDialogOpen);
  const setKeymapOpen = useUIStore((state) => state.setKeymapOpen);
  const setInputDialogOpen = useUIStore((state) => state.setInputDialogOpen);
  const setProposalPreview = useUIStore((state) => state.setProposalPreview);

  // Workflow state
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const setSelectedWorkflowId = useWorkflowStore((state) => state.setSelectedWorkflowId);
  const inputData = useWorkflowStore((state) => state.workflowInputData);
  const setInputData = useWorkflowStore((state) => state.setWorkflowInputData);
  const isLoadingWorkflow = useWorkflowStore((state) => state.isLoadingWorkflow);
  const setIsLoadingWorkflow = useWorkflowStore((state) => state.setIsLoadingWorkflow);
  const loadedWorkflow = useWorkflowStore((state) => state.currentWorkflow);
  const workflows = useWorkflowStore((state) => state.workflows);
  const isLoadingWorkflows = useWorkflowStore((state) => state.isLoading);
  const getWorkflow = useWorkflowStore((state) => state.getWorkflow);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);
  const isPublishing = useWorkflowStore((state) => state.isPublishing);
  const isRestoringVersion = useWorkflowStore((state) => state.isRestoringVersion);

  // Tools state
  const functionBlockSchemas = useToolsStore((state) => state.functionBlocks);
  const functionBlocksMap = useToolsStore((state) => state.functionBlocksByType);

  const editingNode = useMemo(
    () => nodes.find((node) => node.id === editingNodeId) ?? null,
    [nodes, editingNodeId],
  );

  return {
    urlWorkflowId,
    nodes,
    edges,
    editingNodeId,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setEditingNodeId,
    autosaveStatus,
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
    setWorkflowName,
    selectedWorkflowId,
    setSelectedWorkflowId,
    inputData,
    setInputData,
    isLoadingWorkflow,
    setIsLoadingWorkflow,
    loadedWorkflow,
    workflows,
    isLoadingWorkflows,
    getWorkflow,
    isExecuting,
    isPublishing,
    isRestoringVersion,
    functionBlockSchemas,
    functionBlocksMap,
    editingNode,
  };
}

import { useCallback, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, FunctionBlockSchema, TriggerCatalogEntry } from '@/components/workflows/types';
import type { BlockSelectionPayload } from '@/types/block-selection';
import type { InputDef } from '@/types/workflow-spec';
import { toast } from '@/components/ui/sonner';
import { createTriggerNode, createRegularBlockNode } from '../utils/nodeCreation';

export interface UseNodeHandlersParams {
  setNodes: (nodes: Node<WorkflowNodeData>[] | ((prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void;
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setConfigDialogOpen: (open: boolean) => void;
  functionBlocksMap: Map<string, FunctionBlockSchema>;
  triggerCatalog: TriggerCatalogEntry[];
  workflowInputsDef: Record<string, InputDef>;
  gmailIntegrationReady: boolean;
  gmailConnectionId: number | null;
  handleConnectGmail: () => void;
  isConnectingGmail: boolean;
}

function addNodeToCanvas(
  block: BlockSelectionPayload,
  position: { x: number; y: number },
  context: {
    setNodes: (nodes: Node<WorkflowNodeData>[] | ((prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void;
    triggerCatalog: TriggerCatalogEntry[];
    workflowInputsDef: Record<string, InputDef>;
    gmailIntegrationReady: boolean;
    gmailConnectionId: number | null;
    handleConnectGmail: () => void;
    isConnectingGmail: boolean;
    functionBlocksMap: Map<string, FunctionBlockSchema>;
  },
) {
  if (block.type === 'trigger' && block.config?.triggerKey) {
    const triggerKey = block.config.triggerKey;
    const descriptor = context.triggerCatalog.find((t) => t.key === triggerKey);

    if (!descriptor) {
      toast.error('Trigger metadata unavailable');
      return;
    }

    const newNode = createTriggerNode({
      triggerKey,
      descriptor,
      label: block.label,
      workflowInputsDef: context.workflowInputsDef,
      gmailIntegrationReady: context.gmailIntegrationReady,
      gmailConnectionId: context.gmailConnectionId,
      handleConnectGmail: context.handleConnectGmail,
      isConnectingGmail: context.isConnectingGmail,
      position,
    });
    context.setNodes((nds) => [...nds, newNode]);
    return;
  }

  const newNode = createRegularBlockNode(block, position, context.functionBlocksMap);
  context.setNodes((nds) => [...nds, newNode]);
}

export function useNodeHandlers(params: UseNodeHandlersParams) {
  const {
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
  } = params;

  const context = useMemo(
    () => ({
      setNodes,
      triggerCatalog,
      workflowInputsDef,
      gmailIntegrationReady,
      gmailConnectionId,
      handleConnectGmail,
      isConnectingGmail,
      functionBlocksMap,
    }),
    [setNodes, triggerCatalog, workflowInputsDef, gmailIntegrationReady, gmailConnectionId, handleConnectGmail, isConnectingGmail, functionBlocksMap],
  );

  const handleBlockSelect = useCallback(
    (block: BlockSelectionPayload) => {
      addNodeToCanvas(block, { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 }, context);
    },
    [context],
  );

  const handleNodeDrop = useCallback(
    (block: BlockSelectionPayload, position: { x: number; y: number }) => {
      addNodeToCanvas(block, position, context);
    },
    [context],
  );

  const handleCanvasNodeDoubleClick = useCallback(
    (node: Node<WorkflowNodeData>) => {
      if (node.type === 'trigger') return;
      setEditingNodeId(node.id);
      setConfigDialogOpen(true);
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, setConfigDialogOpen, setEditingNodeId],
  );

  const handleConfigDialogOpenChange = useCallback(
    (open: boolean) => {
      setConfigDialogOpen(open);
      if (!open) setEditingNodeId(null);
    },
    [setConfigDialogOpen, setEditingNodeId],
  );

  return { handleBlockSelect, handleNodeDrop, handleCanvasNodeDoubleClick, handleConfigDialogOpenChange };
}

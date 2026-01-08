/**
 * Enhanced Workflow Canvas Component
 * 
 * Supports drag-and-drop blocks, custom node types, and connection validation.
 * Based on ReactFlow (@xyflow/react).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Connection,
  addEdge,
  NodeMouseHandler,
  ConnectionMode,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { WorkflowCanvasContext } from './workflow-canvas-context';
import { FloatingActions } from '@/components/FloatingActions';
import {
  WorkflowNodeData,
  WorkflowEdge,
  ToolBlockConfig,
  getNextBranchForSource,
} from './types';

// Import custom node types
import { ToolBlockNode } from './blocks/ToolBlockNode';
import { LLMBlockNode } from './blocks/LLMBlockNode';
import { IfElseBlockNode } from './blocks/IfElseBlockNode';
import { ForLoopBlockNode } from './blocks/ForLoopBlockNode';
import { InputBlockNode } from './blocks/InputBlockNode';
import { TriggerBlockNode } from './blocks/TriggerBlockNode';
import { useCanvasStore } from '@/stores';
import { useShallow } from 'zustand/shallow';

/**
 * Extract tool names from workflow nodes
 */
export function getToolNamesFromNodes(nodes: Node<WorkflowNodeData>[]): string[] {
  return nodes
    .filter((node) => node.data.type === 'tool')
    .map((node) => {
      const config = node.data.config as ToolBlockConfig | undefined;
      return config?.tool_name || config?.toolName || '';
    })
    .filter(Boolean);
}

const nodeTypes = {
  tool: ToolBlockNode,
  llm: LLMBlockNode,
  if_else: IfElseBlockNode,
  for_loop: ForLoopBlockNode,
  input: InputBlockNode,
  trigger: TriggerBlockNode,
};

interface WorkflowCanvasProps {
  triggerNodes?: Node<WorkflowNodeData>[];
  previewGraph?: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] } | null;
  onNodeDoubleClick?: (node: Node<WorkflowNodeData>) => void;
  onNodeDrop?: (
    blockData: { type: string; label: string; config?: any },
    position: { x: number; y: number },
  ) => void;
  className?: string;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  triggerNodes = [],
  previewGraph = null,
  onNodeDoubleClick,
  onNodeDrop,
  className,
  readOnly = false,
}: WorkflowCanvasProps) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNodeId,
    selectedNodeId,
    updateNode,
  } = useCanvasStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      setSelectedNodeId: state.setSelectedNodeId,
      selectedNodeId: state.selectedNodeId,
      updateNode: state.updateNode,
    })),
  );
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const workflowNodes = previewGraph?.nodes ?? nodes;
  const workflowEdges = previewGraph?.edges ?? edges;

  const renderedNodes = useMemo(() => {
    const workflowNodesWithSelection = workflowNodes.map((node) => {
      const isSelected = selectedNodeId ? node.id === selectedNodeId : false;
      return {
        ...node,
        data: {
          ...node.data,
          selected: isSelected,
        },
      };
    });

    // Don't include separate trigger nodes - triggers should be added like other nodes
    return workflowNodesWithSelection;
  }, [workflowNodes, triggerNodes, selectedNodeId]);

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      updateNode(nodeId, updates);
    },
    [updateNode],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowNodeData>>[]) => {
      if (readOnly) {
        return;
      }
      const updatedNodes = applyNodeChanges<Node<WorkflowNodeData>>(changes, renderedNodes);
      // Don't filter out trigger nodes - they should be part of the workflow
      setNodes(updatedNodes);
    },
    [renderedNodes, readOnly, setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowEdge>[]) => {
      if (readOnly) {
        return;
      }
      setEdges((currentEdges) => applyEdgeChanges<WorkflowEdge>(changes, currentEdges));
    },
    [readOnly, setEdges],
  );

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) {
        return;
      }
      if (!params.source || !params.target) {
        return;
      }

      const wouldCreateCycle = workflowEdges.some(
        (e) => e.target === params.source && e.source === params.target
      );

      if (wouldCreateCycle) {
        console.warn('Connection would create a cycle');
        return;
      }

      const branchFromHandle =
        params.sourceHandle &&
        ['true', 'false', 'loop', 'exit'].includes(params.sourceHandle)
          ? (params.sourceHandle as 'true' | 'false' | 'loop' | 'exit')
          : undefined;
      const branch =
        branchFromHandle ?? getNextBranchForSource(params.source, workflowNodes, workflowEdges);
      const sourceNode = workflowNodes.find((node) => node.id === params.source);

      if (!branch && sourceNode && (sourceNode.type === 'if_else' || sourceNode.type === 'for_loop')) {
        console.warn(`All branch handles are already used for node ${sourceNode.id}`);
        return;
      }

      const newEdge: WorkflowEdge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        data: branch ? { branch } : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      // Remove manual onEdgesChange call - useEffect will handle parent notification
    },
    [workflowEdges, workflowNodes, setEdges, readOnly]
  );

  // Handle node clicks
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (readOnly) {
        return;
      }
      setSelectedNodeId(node.id);
    },
    [readOnly, setSelectedNodeId],
  );

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (readOnly) {
        return;
      }
      onNodeDoubleClick?.(node);
    },
    [readOnly, onNodeDoubleClick],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) return;

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const dragData = JSON.parse(data);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        if (dragData.type === 'block') {
          // Use the onNodeDrop callback if provided, otherwise create node directly
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: dragData.blockType,
                label: dragData.label,
              },
              position
            );
          } else {
            const newNode: Node<WorkflowNodeData> = {
              id: `node-${Date.now()}`,
              type: dragData.blockType,
              position,
              data: {
                type: dragData.blockType,
                label: dragData.label,
                config: {},
              },
            };
            setNodes((nds) => [...nds, newNode]);
          }
        } else if (dragData.type === 'tool') {
          const tool = dragData.tool;
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: 'tool',
                label: tool.name,
                config: {
                  tool_name: tool.slug || tool.name,
                  provider: tool.provider,
                  integration_type: tool.integration_type,
                  ...(tool.output_schema ? { output_schema: tool.output_schema } : {}),
                  params: {},
                },
              },
              position
            );
          } else {
            const newNode: Node<WorkflowNodeData> = {
              id: `node-${Date.now()}`,
              type: 'tool',
              position,
              data: {
                type: 'tool',
                label: tool.name,
                config: {
                  tool_name: tool.slug || tool.name,
                  provider: tool.provider,
                  integration_type: tool.integration_type,
                  ...(tool.output_schema ? { output_schema: tool.output_schema } : {}),
                  params: {},
                },
              },
            };
            setNodes((nds) => [...nds, newNode]);
          }
        } else if (dragData.type === 'trigger') {
          // Handle triggers like blocks - add them directly to canvas
          console.log('[WorkflowCanvas] Trigger dropped:', dragData.triggerKey);
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: 'trigger',
                label: dragData.title || dragData.triggerKey,
                config: {
                  triggerKey: dragData.triggerKey,
                },
              },
              position
            );
          } else {
            // For triggers, we should not create them directly here
            // They need proper metadata which is handled by the parent component
            console.log('[WorkflowCanvas] Trigger dropped without onNodeDrop handler, ignoring');
          }
        }
      } catch (error) {
        console.error('Error processing drop:', error);
      }
    },
    [readOnly, screenToFlowPosition, setNodes, onNodeDrop]
  );

  const contextValue = useMemo(
    () => ({
      nodes: workflowNodes,
      edges: workflowEdges,
      updateNodeData,
    }),
    [workflowNodes, workflowEdges, updateNodeData],
  );

  return (
    <WorkflowCanvasContext.Provider value={contextValue}>
      <div
        ref={reactFlowWrapper}
        className={cn('relative w-full h-full bg-[hsl(var(--canvas-bg))]', className)}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={renderedNodes}
          edges={workflowEdges}
          nodeTypes={nodeTypes as any}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          panOnDrag={[0, 1, 2]}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          minZoom={0.1}
          maxZoom={2}
          selectNodesOnDrag={!readOnly}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--canvas-grid))"
          />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !rounded-lg !shadow-lg"
          />
        </ReactFlow>

        {/* Floating Actions for Settings & Theme */}
        <FloatingActions />
      </div>
    </WorkflowCanvasContext.Provider>
  );
}


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
  NodeMouseHandler,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { WorkflowCanvasContext } from './workflow-canvas-context';
import { FloatingActions } from '@/components/general/FloatingActions';
import { WorkflowNodeData, WorkflowEdge, DroppedBlockData } from '../types';
import { ToolBlockConfig } from '@/components/workflows/block-config/types';

// Import custom node types
import { ToolBlockNode } from '../blocks/ToolBlockNode';
import { LLMBlockNode } from '../blocks/LLMBlockNode';
import { IfElseBlockNode } from '../blocks/IfElseBlockNode';
import { ForLoopBlockNode } from '../blocks/ForLoopBlockNode';
import { useCanvasStore } from '@/stores';
import { useCanvasDragDrop } from '../../../hooks/useCanvasDragDrop';
import { useConnectionValidation } from '../../../hooks/useConnectionValidation';

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

const nodeTypes: NodeTypes = {
  tool: ToolBlockNode,
  llm: LLMBlockNode,
  if_else: IfElseBlockNode,
  for_loop: ForLoopBlockNode,
};

interface WorkflowCanvasProps {
  previewGraph?: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] } | null;
  onNodeDoubleClick?: (node: Node<WorkflowNodeData>) => void;
  onNodeDrop?: (
    blockData: DroppedBlockData,
    position: { x: number; y: number },
  ) => void;
  className?: string;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  previewGraph = null,
  onNodeDoubleClick,
  onNodeDrop,
  className,
  readOnly = false,
}: WorkflowCanvasProps) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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

    // Triggers are now integrated as regular nodes in the workflow graph
    return workflowNodesWithSelection;
  }, [workflowNodes, selectedNodeId]);

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
      // PHASE 3 FIX: Don't depend on renderedNodes - use functional update instead
      // This prevents infinite loops when renderedNodes changes after setNodes
      setNodes((currentNodes) => {
        // Apply selection state to current nodes before applying changes
        const nodesWithSelection = currentNodes.map((node) => {
          const isSelected = selectedNodeId ? node.id === selectedNodeId : false;
          return {
            ...node,
            data: {
              ...node.data,
              selected: isSelected,
            },
          };
        });
        return applyNodeChanges<Node<WorkflowNodeData>>(changes, nodesWithSelection);
      });
    },
    [readOnly, setNodes, selectedNodeId],
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

  // Handle connections via extracted hook
  const { onConnect } = useConnectionValidation({
    readOnly,
    workflowNodes,
    workflowEdges,
    setEdges,
  });

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
      onNodeDoubleClick?.(node as Node<WorkflowNodeData>);
    },
    [readOnly, onNodeDoubleClick],
  );

  // Drag & drop via extracted hook
  const { onDragOver, onDrop } = useCanvasDragDrop({ readOnly, setNodes, onNodeDrop });

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
          nodeTypes={nodeTypes}
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


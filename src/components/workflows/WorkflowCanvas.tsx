/**
 * Enhanced Workflow Canvas Component
 * 
 * Supports drag-and-drop blocks, custom node types, and connection validation.
 * Based on ReactFlow (@xyflow/react).
 */
import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  ConnectionMode,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { WorkflowCanvasContext } from './workflow-canvas-context';
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
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: WorkflowEdge[];
  onNodesChange?: (nodes: Node<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (node: Node<WorkflowNodeData>) => void;
  selectedNodeId?: string | null;
  className?: string;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeDoubleClick,
  selectedNodeId,
  className,
  readOnly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((prevNodes) => {
        // Check if node still exists before updating
        const nodeExists = prevNodes.some(n => n.id === nodeId);
        if (!nodeExists) {
          console.warn(`Attempted to update non-existent node: ${nodeId}`);
          return prevNodes; // Return unchanged to prevent unnecessary render
        }

        const updatedNodes = prevNodes.map((node) => {
          if (node.id === nodeId) {
            const mergedData = { ...node.data, ...updates };
            if (updates.config) {
              // Always preserve fields array if it exists in updates, even if empty
              const mergedConfig = {
                ...node.data.config,
                ...updates.config,
              };
              // Explicitly preserve fields array if present in updates
              if ('fields' in updates.config) {
                mergedConfig.fields = updates.config.fields;
              }
              mergedData.config = mergedConfig;
            }
            return { ...node, data: mergedData };
          }
          return node;
        });
        // Remove onNodesChange call - useEffect will handle parent notification
        return updatedNodes;
      });
    },
    [setNodes],
  );

  // Sync with parent state changes using smart change detection
  useEffect(() => {
    setNodes(currentNodes => {
      // Only sync if nodes truly changed (different count or IDs)
      if (initialNodes.length !== currentNodes.length) {
        return initialNodes;
      }

      // Check if node IDs differ (new nodes added or removed)
      const currentIds = new Set(currentNodes.map(n => n.id));
      const newIds = new Set(initialNodes.map(n => n.id));

      const hasChanges =
        currentIds.size !== newIds.size ||
        [...newIds].some(id => !currentIds.has(id));

      return hasChanges ? initialNodes : currentNodes;
    });
  }, [initialNodes]);

  useEffect(() => {
    setEdges(currentEdges => {
      // Only sync if edges truly changed
      if (initialEdges.length !== currentEdges.length) {
        return initialEdges;
      }

      const currentIds = new Set(currentEdges.map(e => e.id));
      const newIds = new Set(initialEdges.map(e => e.id));

      const hasChanges =
        currentIds.size !== newIds.size ||
        [...newIds].some(id => !currentIds.has(id));

      return hasChanges ? initialEdges : currentEdges;
    });
  }, [initialEdges]);

  // Update nodes when selectedNodeId changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedNodeId,
        },
      }))
    );
  }, [selectedNodeId, setNodes]);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowNodeData>>[]) => {
      setNodes((currentNodes) => {
        return applyNodeChanges<Node<WorkflowNodeData>>(changes, currentNodes);
      });
    },
    [setNodes]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowEdge>[]) => {
      setEdges((currentEdges) => {
        return applyEdgeChanges<WorkflowEdge>(changes, currentEdges);
      });
    },
    [setEdges]
  );

  // Notify parent of node changes after state update completes
  useEffect(() => {
    if (onNodesChange) {
      onNodesChange(nodes);
    }
  }, [nodes, onNodesChange]);

  // Notify parent of edge changes after state update completes
  useEffect(() => {
    if (onEdgesChange) {
      onEdgesChange(edges);
    }
  }, [edges, onEdgesChange]);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) {
        return;
      }
      if (!params.source || !params.target) {
        return;
      }

      const wouldCreateCycle = edges.some(
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
      const branch = branchFromHandle ?? getNextBranchForSource(params.source, nodes, edges);
      const sourceNode = nodes.find((node) => node.id === params.source);

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
    [edges, nodes, setEdges, readOnly]
  );

  // Handle node clicks
  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (onNodeSelect) {
        onNodeSelect(node.id);
      }
    },
    [onNodeSelect]
  );

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node as Node<WorkflowNodeData>);
      }
    },
    [onNodeDoubleClick],
  );

  const contextValue = useMemo(
    () => ({
      nodes,
      edges,
      updateNodeData,
    }),
    [nodes, edges, updateNodeData],
  );

  return (
    <WorkflowCanvasContext.Provider value={contextValue}>
      <div className={cn('w-full h-full bg-[hsl(var(--canvas-bg))]', className)}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes as any}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={readOnly ? undefined : handleNodeDoubleClick}
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
      </div>
    </WorkflowCanvasContext.Provider>
  );
}


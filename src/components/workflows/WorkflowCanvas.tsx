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
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((prevNodes) => {
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
        if (onNodesChange) {
          onNodesChange(updatedNodes);
        }
        return updatedNodes;
      });
    },
    [onNodesChange, setNodes],
  );

  // Sync with parent state changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Update nodes when selectedNodeId changes
  useMemo(() => {
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
    (changes: any) => {
      onNodesChangeInternal(changes);
      if (onNodesChange) {
        const updatedNodes = changes.reduce((acc: Node[], change: any) => {
          if (change.type === 'remove') {
            return acc.filter((n) => n.id !== change.id);
          }
          if (change.type === 'add') {
            return [...acc, change.item];
          }
          if (change.type === 'position' && change.position) {
            return acc.map((n) =>
              n.id === change.id ? { ...n, position: change.position } : n
            );
          }
          if (change.type === 'dimensions' && change.dimensions) {
            return acc.map((n) =>
              n.id === change.id
                ? { ...n, measured: change.dimensions }
                : n
            );
          }
          return acc;
        }, nodes);
        onNodesChange(updatedNodes);
      }
    },
    [nodes, onNodesChange, onNodesChangeInternal]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        const updatedEdges = changes.reduce((acc: WorkflowEdge[], change: any) => {
          if (change.type === 'remove') {
            return acc.filter((e) => e.id !== change.id);
          }
          if (change.type === 'add') {
            return [...acc, change.item];
          }
          return acc;
        }, edges);
        onEdgesChange(updatedEdges);
      }
    },
    [edges, onEdgesChange, onEdgesChangeInternal]
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
      if (onEdgesChange) {
        onEdgesChange([...edges, newEdge]);
      }
    },
    [edges, nodes, setEdges, onEdgesChange, readOnly]
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
          zoomOnScroll
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


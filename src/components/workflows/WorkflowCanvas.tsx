/**
 * Enhanced Workflow Canvas Component
 * 
 * Supports drag-and-drop blocks, custom node types, and connection validation.
 * Based on ReactFlow (@xyflow/react).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Edge,
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
  WorkflowEdgeData,
  ToolBlockConfig,
  getNextBranchForSource,
} from './types';

// Import custom node types
import { ToolBlockNode } from './blocks/ToolBlockNode';
import { CodeBlockNode } from './blocks/CodeBlockNode';
import { LLMBlockNode } from './blocks/LLMBlockNode';
import { IfElseBlockNode } from './blocks/IfElseBlockNode';
import { ForLoopBlockNode } from './blocks/ForLoopBlockNode';
import { InputBlockNode } from './blocks/InputBlockNode';

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
  code: CodeBlockNode,
  llm: LLMBlockNode,
  if_else: IfElseBlockNode,
  for_loop: ForLoopBlockNode,
  input: InputBlockNode,
};

interface WorkflowCanvasProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: WorkflowEdge[];
  onNodesChange?: (nodes: Node<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  className?: string;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  selectedNodeId,
  className,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((prevNodes) => {
        const updatedNodes = prevNodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node,
        );
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

      const branch = getNextBranchForSource(params.source, nodes, edges);
      const newEdge: WorkflowEdge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
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
    [edges, nodes, setEdges, onEdgesChange]
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

  const contextValue = useMemo(
    () => ({
      nodes,
      updateNodeData,
    }),
    [nodes, updateNodeData],
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
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          panOnDrag={[1, 2]}
          zoomOnScroll
          minZoom={0.1}
          maxZoom={2}
          selectNodesOnDrag={false}
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


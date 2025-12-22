/**
 * Enhanced Workflow Canvas Component
 * 
 * Supports drag-and-drop blocks, custom node types, and connection validation.
 * Based on ReactFlow (@xyflow/react).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
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

// Import custom node types
import { ToolBlockNode } from './blocks/ToolBlockNode';
import { CodeBlockNode } from './blocks/CodeBlockNode';
import { LLMBlockNode } from './blocks/LLMBlockNode';
import { IfElseBlockNode } from './blocks/IfElseBlockNode';
import { ForLoopBlockNode } from './blocks/ForLoopBlockNode';
import { VariableBlockNode } from './blocks/VariableBlockNode';
import { InputBlockNode } from './blocks/InputBlockNode';
import { OutputBlockNode } from './blocks/OutputBlockNode';

export type BlockType =
  | 'tool'
  | 'code'
  | 'llm'
  | 'if_else'
  | 'for_loop'
  | 'variable'
  | 'input'
  | 'output';

export interface WorkflowNodeData {
  type: BlockType;
  label: string;
  config?: Record<string, any>;
  python_code?: string;
  oauth_scope?: string;
  selected?: boolean;
  onSelect?: () => void;
}

const nodeTypes = {
  tool: ToolBlockNode,
  code: CodeBlockNode,
  llm: LLMBlockNode,
  if_else: IfElseBlockNode,
  for_loop: ForLoopBlockNode,
  variable: VariableBlockNode,
  input: InputBlockNode,
  output: OutputBlockNode,
};

interface WorkflowCanvasProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
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
          if (change.type === 'position' || change.type === 'dimensions') {
            return acc.map((n) =>
              n.id === change.id ? { ...n, ...change } : n
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
        const updatedEdges = changes.reduce((acc: Edge[], change: any) => {
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
      // Validate connection
      if (!params.source || !params.target) {
        return;
      }

      // Check for cycles (basic validation)
      const wouldCreateCycle = edges.some(
        (e) => e.target === params.source && e.source === params.target
      );

      if (wouldCreateCycle) {
        console.warn('Connection would create a cycle');
        return;
      }

      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      if (onEdgesChange) {
        onEdgesChange([...edges, newEdge]);
      }
    },
    [edges, setEdges, onEdgesChange]
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

  return (
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
        <MiniMap
          className="!bg-card !border-border !rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'input') return '#10b981';
            if (node.type === 'output') return '#3b82f6';
            return '#6b7280';
          }}
        />
      </ReactFlow>
    </div>
  );
}


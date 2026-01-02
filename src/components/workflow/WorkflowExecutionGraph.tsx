/**
 * WorkflowExecutionGraph - Read-only React Flow visualization of workflow execution
 *
 * Displays workflow graph with execution status overlays on nodes
 */
import { useCallback, useMemo, useEffect, memo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Wrench,
  Sparkles,
  GitBranch,
  Repeat,
  FileInput,
  Code,
} from 'lucide-react';

type NodeStatus = 'not_executed' | 'running' | 'succeeded' | 'failed';

export interface ExecutionGraphNode {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
}

export interface ExecutionGraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface NodeExecutionTrace {
  node_id: string;
  node_type: string;
  inputs?: Record<string, any>;
  output?: any;
  timestamp?: string;
  error?: string;
}

interface WorkflowExecutionGraphProps {
  executionGraph: {
    nodes: ExecutionGraphNode[];
    edges: ExecutionGraphEdge[];
  };
  traces: NodeExecutionTrace[];
  reactflowGraph?: {
    nodes: Array<{ id: string; position: { x: number; y: number }; [key: string]: any }>;
    edges: Array<{ source: string; target: string; [key: string]: any }>;
  };
  currentNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

// Get icon for node type
function getNodeTypeIcon(nodeType: string) {
  switch (nodeType) {
    case 'tool':
      return <Wrench className="w-4 h-4" />;
    case 'llm':
      return <Sparkles className="w-4 h-4" />;
    case 'if_else':
    case 'if':
      return <GitBranch className="w-4 h-4" />;
    case 'for_loop':
    case 'for_each':
      return <Repeat className="w-4 h-4" />;
    case 'input':
      return <FileInput className="w-4 h-4" />;
    default:
      return <Code className="w-4 h-4" />;
  }
}

// Get color for node type
function getNodeTypeColor(nodeType: string) {
  switch (nodeType) {
    case 'tool':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'llm':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
    case 'if_else':
    case 'if':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'for_loop':
    case 'for_each':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
    case 'input':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30';
  }
}

// Simple read-only execution node component (no context dependencies)
const ExecutionNode = memo(function ExecutionNode({ data }: NodeProps) {
  const status = data.executionStatus as NodeStatus;
  const nodeType = data.type as string;
  const label = data.label as string;

  const statusIcon = useMemo(() => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  }, [status]);

  const nodeColor = getNodeTypeColor(nodeType);

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 min-w-[160px] max-w-[280px] transition-all duration-200 cursor-pointer select-none bg-card',
        status === 'not_executed' && 'opacity-50 border-gray-300 dark:border-gray-600',
        status === 'running' && 'border-blue-500 ring-2 ring-blue-500/30 animate-pulse',
        status === 'succeeded' && 'border-green-500',
        status === 'failed' && 'border-red-500',
        status !== 'not_executed' && status !== 'running' && status !== 'succeeded' && status !== 'failed' && 'border-border',
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />

      {/* Node content */}
      <div className="flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded flex items-center justify-center shrink-0 border', nodeColor)}>
          {getNodeTypeIcon(nodeType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{label}</p>
          <p className="text-xs text-muted-foreground capitalize">{nodeType.replace('_', ' ')}</p>
        </div>
        {statusIcon && (
          <div className="shrink-0">
            {statusIcon}
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
});

// Node types for React Flow
const nodeTypes = {
  tool: ExecutionNode,
  llm: ExecutionNode,
  if_else: ExecutionNode,
  if: ExecutionNode,
  for_loop: ExecutionNode,
  for_each: ExecutionNode,
  input: ExecutionNode,
  task: ExecutionNode,
  default: ExecutionNode,
};

export function WorkflowExecutionGraph({
  executionGraph,
  traces,
  reactflowGraph,
  currentNodeId,
  onNodeClick,
  className,
}: WorkflowExecutionGraphProps) {
  // Build execution status map
  const executionStatusMap = useMemo(() => {
    const map = new Map<string, NodeStatus>();

    traces.forEach((trace) => {
      if (trace.error) {
        map.set(trace.node_id, 'failed');
      } else if (trace.output !== undefined || trace.timestamp) {
        // Node succeeded if it has output OR a timestamp (meaning it executed)
        map.set(trace.node_id, 'succeeded');
      } else {
        map.set(trace.node_id, 'running');
      }
    });

    // Mark current node as running if not already in traces
    if (currentNodeId && !map.has(currentNodeId)) {
      map.set(currentNodeId, 'running');
    }

    return map;
  }, [traces, currentNodeId]);

  // Build set of executed node IDs for edge highlighting
  const executedNodeIds = useMemo(() => {
    return new Set(traces.map((t) => t.node_id));
  }, [traces]);

  // Convert execution graph to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return executionGraph.nodes.map((node) => {
      // Try to get position from reactflowGraph first, fall back to auto-layout
      const reactflowNode = reactflowGraph?.nodes?.find((n) => n.id === node.id);
      const position = reactflowNode?.position || node.position || { x: 0, y: 0 };

      const status = executionStatusMap.get(node.id) || 'not_executed';

      return {
        id: node.id,
        type: node.type || 'tool',
        position,
        data: {
          id: node.id,
          label: node.label || node.id,
          type: node.type || 'tool',
          executionStatus: status,
          selected: false,
        },
      };
    });
  }, [executionGraph.nodes, reactflowGraph, executionStatusMap]);

  // Convert execution graph to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return executionGraph.edges.map((edge, index) => {
      const sourceExecuted = executedNodeIds.has(edge.source);
      const targetExecuted = executedNodeIds.has(edge.target);
      const isExecuted = sourceExecuted && targetExecuted;

      return {
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: isExecuted,
        style: {
          stroke: isExecuted ? '#10b981' : '#d1d5db',
          strokeWidth: isExecuted ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isExecuted ? '#10b981' : '#d1d5db',
        },
      };
    });
  }, [executionGraph.edges, executedNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes/edges when props change
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const status = executionStatusMap.get(node.id);
      // Only allow clicking on executed nodes
      if (status && status !== 'not_executed' && onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [executionStatusMap, onNodeClick]
  );

  return (
    <div className={cn('w-full h-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Edge,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Zap, CheckCircle } from 'lucide-react';
import { WorkflowNode } from './WorkflowNode';
import { ExperimentNode } from './ExperimentNode';
import { ContinueEdge } from './ContinueButton';
import { NodeStatus, ExperimentResult } from '@/types/workflow';

interface WorkflowCanvasProps {
  nodeStatuses: Record<string, NodeStatus>;
  currentStep: string;
  experimentResult: ExperimentResult | null;
  selectedNode: string | null;
  onContinue: (nodeId: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

const nodeTypes = {
  workflow: WorkflowNode,
  experiment: ExperimentNode,
} as const;

const edgeTypes = {
  continue: ContinueEdge,
} as const;

export function WorkflowCanvas({
  nodeStatuses,
  currentStep,
  experimentResult,
  selectedNode,
  onContinue,
  onNodeSelect,
}: WorkflowCanvasProps) {
  const nodes: Node[] = useMemo(() => [
    {
      id: 'agentSpec',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: { 
        label: 'AgentSpec', 
        status: nodeStatuses.agentSpec, 
        type: 'agentSpec',
        selected: selectedNode === 'agentSpec',
        onSelect: () => onNodeSelect('agentSpec'),
      },
    },
    {
      id: 'evals',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: { 
        label: 'Evals', 
        status: nodeStatuses.evals, 
        type: 'evals',
        selected: selectedNode === 'evals',
        onSelect: () => onNodeSelect('evals'),
      },
    },
    {
      id: 'experiment',
      type: 'experiment',
      position: { x: 700, y: 200 },
      data: {
        label: 'Experiment',
        status: nodeStatuses.experiment,
        expanded: nodeStatuses.experiment === 'processing' || nodeStatuses.experiment === 'complete',
        subNodes: [
          { id: 'provision', label: 'Provision', status: experimentResult?.provision.status || 'idle', icon: Play },
          { id: 'invoke', label: 'Invoke Target', status: experimentResult?.invoke.status || 'idle', icon: Zap },
          { id: 'assert', label: 'Assert', status: experimentResult?.assert.status || 'idle', icon: CheckCircle },
        ],
        selected: selectedNode === 'experiment',
        onSelect: () => onNodeSelect('experiment'),
      },
    },
    {
      id: 'codex',
      type: 'workflow',
      position: { x: 1050, y: 200 },
      data: { 
        label: 'Codex', 
        status: nodeStatuses.codex, 
        type: 'codex',
        selected: selectedNode === 'codex',
        onSelect: () => onNodeSelect('codex'),
      },
    },
  ], [nodeStatuses, experimentResult, selectedNode, onNodeSelect]);

  const edges: Edge[] = useMemo(() => [
    {
      id: 'agentSpec-evals',
      source: 'agentSpec',
      target: 'evals',
      type: 'continue',
      data: {
        showButton: nodeStatuses.agentSpec === 'complete' && nodeStatuses.evals === 'idle',
        onContinue: () => onContinue('evals'),
      },
    },
    {
      id: 'evals-experiment',
      source: 'evals',
      target: 'experiment',
      type: 'continue',
      data: {
        showButton: nodeStatuses.evals === 'complete' && nodeStatuses.experiment === 'idle',
        onContinue: () => onContinue('experiment'),
      },
    },
    {
      id: 'experiment-codex',
      source: 'experiment',
      target: 'codex',
      type: 'continue',
      data: {
        showButton: nodeStatuses.experiment === 'complete' && nodeStatuses.codex === 'idle',
        onContinue: () => onContinue('codex'),
      },
    },
  ], [nodeStatuses, onContinue]);

  // Handle node clicks using ReactFlow's built-in handler
  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full bg-[hsl(var(--canvas-bg))]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={[1, 2]}
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
        selectNodesOnDrag={false}
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
  );
}

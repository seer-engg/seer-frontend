import { Edge, Node } from '@xyflow/react';

export type BlockType =
  | 'tool'
  | 'code'
  | 'llm'
  | 'if_else'
  | 'for_loop'
  | 'input'
  | 'variable';

export interface ToolBlockConfig extends Record<string, any> {
  tool_name?: string;
  toolName?: string; // Legacy support
  connection_id?: string;
  arguments?: Record<string, any>;
}

export interface WorkflowNodeData {
  type: BlockType;
  label: string;
  config?: ToolBlockConfig;
  python_code?: string;
  oauth_scope?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export type WorkflowEdgeData = {
  branch?: 'true' | 'false';
};

export type WorkflowEdge = Edge<WorkflowEdgeData>;

export function getNextBranchForSource(
  sourceId: string | null | undefined,
  nodes: Node<WorkflowNodeData>[],
  edges: WorkflowEdge[],
): 'true' | 'false' | undefined {
  if (!sourceId) {
    return undefined;
  }

  const sourceNode = nodes.find((node) => node.id === sourceId);
  if (!sourceNode || sourceNode.type !== 'if_else') {
    return undefined;
  }

  const outgoing = edges.filter((edge) => edge.source === sourceId);
  const hasTrue = outgoing.some((edge) => edge.data?.branch === 'true');
  const hasFalse = outgoing.some((edge) => edge.data?.branch === 'false');

  if (!hasTrue) {
    return 'true';
  }
  if (!hasFalse) {
    return 'false';
  }

  return undefined;
}



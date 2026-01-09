import { useCallback } from 'react';
import { addEdge, MarkerType, type Connection } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { WorkflowEdge, WorkflowNodeData } from '../components/workflows/types';
import { getNextBranchForSource } from '../components/workflows/types';

type SetEdges = (
  edges:
    | WorkflowEdge[]
    | ((edges: WorkflowEdge[]) => WorkflowEdge[]),
) => void;

interface UseConnectionValidationParams {
  readOnly?: boolean;
  workflowNodes: Node<WorkflowNodeData>[];
  workflowEdges: WorkflowEdge[];
  setEdges: SetEdges;
}

export function useConnectionValidation({
  readOnly = false,
  workflowNodes,
  workflowEdges,
  setEdges,
}: UseConnectionValidationParams) {
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      if (!params.source || !params.target) return;

      const wouldCreateCycle = workflowEdges.some(
        (e) => e.target === params.source && e.source === params.target,
      );
      if (wouldCreateCycle) {
        console.warn('Connection would create a cycle');
        return;
      }

      const branchFromHandle =
        params.sourceHandle && ['true', 'false', 'loop', 'exit'].includes(params.sourceHandle)
          ? (params.sourceHandle as 'true' | 'false' | 'loop' | 'exit')
          : undefined;

      const branch =
        branchFromHandle ?? getNextBranchForSource(params.source!, workflowNodes, workflowEdges);

      const sourceNode = workflowNodes.find((node) => node.id === params.source);
      if (!branch && sourceNode && (sourceNode.type === 'if_else' || sourceNode.type === 'for_loop')) {
        console.warn(`All branch handles are already used for node ${sourceNode.id}`);
        return;
      }

      const newEdge: WorkflowEdge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        data: branch ? { branch } : undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [readOnly, workflowEdges, workflowNodes, setEdges],
  );

  return { onConnect } as const;
}

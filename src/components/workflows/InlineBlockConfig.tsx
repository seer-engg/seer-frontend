import { memo, useMemo } from 'react';
import { BlockConfigPanel } from './BlockConfigPanel';
import { useWorkflowCanvasContext } from './workflow-canvas-context';

interface InlineBlockConfigProps {
  nodeId: string;
}

export const InlineBlockConfig = memo(function InlineBlockConfig({
  nodeId,
}: InlineBlockConfigProps) {
  const { nodes, edges, updateNodeData } = useWorkflowCanvasContext();

  const node = useMemo(() => nodes.find((n) => n.id === nodeId) || null, [nodes, nodeId]);

  if (!node) {
    return null;
  }

  return (
    <BlockConfigPanel
      node={node}
      onUpdate={updateNodeData}
      allNodes={nodes}
      allEdges={edges}
      autoSave={false}
      liveUpdate
      variant="inline"
    />
  );
});



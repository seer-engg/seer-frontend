import { memo, useMemo } from 'react';
import { BlockConfigPanel } from './BlockConfigPanel';
import { useWorkflowCanvasContext } from './workflow-canvas-context';

interface InlineBlockConfigProps {
  nodeId: string;
}

export const InlineBlockConfig = memo(function InlineBlockConfig({
  nodeId,
}: InlineBlockConfigProps) {
  const { nodes, updateNodeData } = useWorkflowCanvasContext();

  const node = useMemo(() => nodes.find((n) => n.id === nodeId) || null, [nodes, nodeId]);

  if (!node) {
    return null;
  }

  return (
    <div
      className="mt-3 space-y-4 rounded-md border bg-muted/40 px-3 py-3"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <BlockConfigPanel
        node={node}
        onUpdate={updateNodeData}
        allNodes={nodes}
        autoSave={false}
        liveUpdate
        variant="inline"
      />
    </div>
  );
});



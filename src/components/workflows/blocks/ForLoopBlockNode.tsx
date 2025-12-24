import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../types';
import { InlineBlockConfig } from '../InlineBlockConfig';
import { BaseBlockNode } from './BaseBlockNode';

export const ForLoopBlockNode = memo(function ForLoopBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<Repeat className="w-4 h-4 text-green-500" />}
      color="green"
      handles={{
        inputs: ['array'],
        outputs: ['item', 'done'],
      }}
    >
      <InlineBlockConfig nodeId={props.id} />
    </BaseBlockNode>
  );
});


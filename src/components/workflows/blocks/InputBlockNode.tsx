import { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../types';
import { InlineBlockConfig } from '../InlineBlockConfig';
import { BaseBlockNode } from './BaseBlockNode';

export const InputBlockNode = memo(function InputBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<ArrowRight className="w-4 h-4 text-green-500" />}
      color="green"
      handles={{
        inputs: [],
        outputs: ['output'],
      }}
    >
      <InlineBlockConfig nodeId={props.id} />
    </BaseBlockNode>
  );
});


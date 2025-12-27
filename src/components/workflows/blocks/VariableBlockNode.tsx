import { memo } from 'react';
import { FunctionSquare } from 'lucide-react';
import { NodeProps } from '@xyflow/react';

import { WorkflowNodeData } from '../types';
import { InlineBlockConfig } from '../InlineBlockConfig';
import { BaseBlockNode } from './BaseBlockNode';

export const VariableBlockNode = memo(function VariableBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<FunctionSquare className="w-4 h-4 text-purple-500" />}
      color="purple"
      handles={{
        inputs: ['input'],
        outputs: ['output'],
      }}
    >
      <InlineBlockConfig nodeId={props.id} />
    </BaseBlockNode>
  );
});


import { memo } from 'react';
import { Database } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const VariableBlockNode = memo(function VariableBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<Database className="w-4 h-4 text-yellow-500" />}
      color="yellow"
      handles={{
        inputs: ['value'],
        outputs: ['output'],
      }}
    />
  );
});


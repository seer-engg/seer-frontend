import { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const OutputBlockNode = memo(function OutputBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<ArrowLeft className="w-4 h-4 text-blue-500" />}
      color="blue"
      handles={{
        inputs: ['input'],
        outputs: [],
      }}
    />
  );
});


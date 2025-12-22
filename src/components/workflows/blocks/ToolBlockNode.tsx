import { memo } from 'react';
import { Wrench } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const ToolBlockNode = memo(function ToolBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<Wrench className="w-4 h-4 text-primary" />}
      color="primary"
      handles={{
        inputs: ['input'],
        outputs: ['output'],
      }}
    />
  );
});


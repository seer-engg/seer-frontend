import { memo } from 'react';
import { Code } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const CodeBlockNode = memo(function CodeBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<Code className="w-4 h-4 text-blue-500" />}
      color="blue"
      handles={{
        inputs: ['input'],
        outputs: ['output'],
      }}
    />
  );
});


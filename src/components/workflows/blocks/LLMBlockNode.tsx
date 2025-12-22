import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const LLMBlockNode = memo(function LLMBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<Sparkles className="w-4 h-4 text-purple-500" />}
      color="purple"
      handles={{
        inputs: ['input'],
        outputs: ['output'],
      }}
    />
  );
});


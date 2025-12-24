import { memo } from 'react';
import { GitBranch } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const IfElseBlockNode = memo(function IfElseBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<GitBranch className="w-4 h-4 text-orange-500" />}
      color="orange"
      handles={{
        inputs: ['input'],
        outputs: ['true', 'false'],
      }}
    />
  );
});


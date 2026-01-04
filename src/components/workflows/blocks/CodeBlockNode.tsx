import { memo } from 'react';
import { Code } from 'lucide-react';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../types';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';
import { BaseBlockNode } from './BaseBlockNode';

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
    >
      <WorkflowNodeSummary
        config={props.data?.config}
        priorityKeys={['entrypoint', 'file', 'handler']}
      />
    </BaseBlockNode>
  );
});


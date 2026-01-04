import { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../types';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';
import { BaseBlockNode } from './BaseBlockNode';

export const InputBlockNode = memo(function InputBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={null}
      color="green"
      minWidth="500px"
      handles={{
        inputs: [],
        outputs: ['output'],
      }}
    >
      <WorkflowNodeSummary
        config={props.data?.config}
        priorityKeys={['fields', 'variable_name']}
      />
    </BaseBlockNode>
  );
});


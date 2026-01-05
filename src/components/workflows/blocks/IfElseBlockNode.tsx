import { memo } from 'react';
import { GitBranch } from 'lucide-react';
import { Handle, NodeProps, Position, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';
import { BaseBlockNode } from './BaseBlockNode';

type WorkflowNode = Node<WorkflowNodeData>;

export const IfElseBlockNode = memo(function IfElseBlockNode(
  props: NodeProps<WorkflowNode>
) {
  return (
    <BaseBlockNode
      {...props}
      icon={<GitBranch className="w-4 h-4 text-orange-500" />}
      color="orange"
      handles={{
        inputs: ['input'],
        outputs: [],
      }}
    >
      <WorkflowNodeSummary
        config={props.data?.config}
        priorityKeys={['condition']}
      />
      <div className="mt-2 h-16">
        <Handle
          id="true"
          type="source"
          position={Position.Right}
          style={{
            position: 'absolute',
            top: '35%',
            right: -8,
          }}
          className="!w-3 !h-3 !bg-orange-500 !border-2 !border-background"
        />
        <Handle
          id="false"
          type="source"
          position={Position.Right}
          style={{
            position: 'absolute',
            top: '75%',
            right: -8,
          }}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
        <div
          className="pointer-events-none absolute inset-y-0 text-[11px] text-muted-foreground"
          style={{ right: 'calc(-8px - 0.25rem)' }}
        >
          <span
            className={cn('absolute rounded bg-muted px-2 py-0.5 text-xs')}
            style={{ top: '35%', transform: 'translateY(-50%)' }}
          >
            True
          </span>
          <span
            className={cn('absolute rounded bg-muted px-2 py-0.5 text-xs')}
            style={{ top: '75%', transform: 'translateY(-50%)' }}
          >
            False
          </span>
        </div>
      </div>
    </BaseBlockNode>
  );
});


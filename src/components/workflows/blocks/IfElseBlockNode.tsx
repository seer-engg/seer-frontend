import { memo } from 'react';
import { GitBranch } from 'lucide-react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { InlineBlockConfig } from '../InlineBlockConfig';
import { BaseBlockNode } from './BaseBlockNode';

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
        outputs: [],
      }}
    >
      <div className="relative mt-2 h-16">
        <Handle
          id="true"
          type="source"
          position={Position.Right}
          style={{
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
            top: '75%',
            right: -8,
          }}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
        <div className="absolute -right-14 top-4 flex flex-col gap-2 text-[11px] text-muted-foreground">
          <span className={cn('rounded bg-muted px-2 py-0.5 text-xs')}>
            True
          </span>
          <span className={cn('rounded bg-muted px-2 py-0.5 text-xs')}>
            False
          </span>
        </div>
      </div>

      <InlineBlockConfig nodeId={props.id} />
    </BaseBlockNode>
  );
});


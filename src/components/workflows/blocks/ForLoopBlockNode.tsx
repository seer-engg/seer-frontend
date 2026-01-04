import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';
import { BaseBlockNode } from './BaseBlockNode';

export const ForLoopBlockNode = memo(function ForLoopBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  const config = props.data.config || {};
  const literalItems = Array.isArray(config.array_literal) ? config.array_literal : [];
  const literalPreview = literalItems.slice(0, 3).join(', ');
  const hasLegacyLiteral = literalItems.length > 0;

  return (
    <BaseBlockNode
      {...props}
      icon={<Repeat className="w-4 h-4 text-green-500" />}
      color="green"
      handles={{
        inputs: ['input'],
        outputs: [],
      }}
    >
      <WorkflowNodeSummary
        config={props.data?.config}
        priorityKeys={['array_mode', 'array_variable', 'item_var']}
      />
      {hasLegacyLiteral && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Legacy list: {literalPreview}
          {literalItems.length > 3 ? '…' : ''}
        </p>
      )}

      <div className="relative mt-4 h-16">
        <Handle
          id="loop"
          type="source"
          position={Position.Right}
          style={{
            top: '35%',
            right: -8,
          }}
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
        />
        <Handle
          id="exit"
          type="source"
          position={Position.Right}
          style={{
            top: '75%',
            right: -8,
          }}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
        <div className="absolute -right-12 top-4 flex flex-col gap-2 text-[11px] text-muted-foreground">
          <span className={cn('rounded bg-muted px-2 py-0.5 text-xs')}>Loop</span>
          <span className={cn('rounded bg-muted px-2 py-0.5 text-xs')}>Exit</span>
        </div>
      </div>

    </BaseBlockNode>
  );
});


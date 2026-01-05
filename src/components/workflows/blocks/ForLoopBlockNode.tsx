import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';
import { BaseBlockNode } from './BaseBlockNode';

type WorkflowNode = Node<WorkflowNodeData>;

export const ForLoopBlockNode = memo(function ForLoopBlockNode(
  props: NodeProps<WorkflowNode>
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

      <div className="mt-4 h-16">
        <Handle
          id="loop"
          type="source"
          position={Position.Right}
          style={{
            position: 'absolute',
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
            Loop
          </span>
          <span
            className={cn('absolute rounded bg-muted px-2 py-0.5 text-xs')}
            style={{ top: '75%', transform: 'translateY(-50%)' }}
          >
            Exit
          </span>
        </div>
      </div>

    </BaseBlockNode>
  );
});


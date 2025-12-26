import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { InlineBlockConfig } from '../InlineBlockConfig';
import { BaseBlockNode } from './BaseBlockNode';

export const ForLoopBlockNode = memo(function ForLoopBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  const config = props.data.config || {};
  const arrayMode: 'variable' | 'literal' =
    (config.array_mode as 'variable' | 'literal') ||
    (Array.isArray(config.array_literal) && config.array_literal.length > 0 ? 'literal' : 'variable');
  const arrayVariable = config.array_variable || config.array_var || 'items';
  const literalItems = Array.isArray(config.array_literal) ? config.array_literal : [];
  const literalPreview = literalItems.slice(0, 3).join(', ');
  const itemVar = config.item_var || 'item';

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
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Source:{' '}
          {arrayMode === 'variable'
            ? arrayVariable
            : `${literalItems.length} item${literalItems.length === 1 ? '' : 's'}`}
        </p>
        {arrayMode === 'literal' && literalItems.length > 0 && (
          <p className="truncate text-[11px]">{literalPreview}{literalItems.length > 3 ? '…' : ''}</p>
        )}
        <p>Item variable: <span className="font-medium text-foreground">{itemVar}</span></p>
      </div>

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

      <InlineBlockConfig nodeId={props.id} />
    </BaseBlockNode>
  );
});


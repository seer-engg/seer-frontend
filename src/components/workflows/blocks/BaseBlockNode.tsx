/**
 * Base Block Node Component
 * 
 * Common functionality for all workflow block nodes.
 */
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../WorkflowCanvas';

interface BaseBlockNodeProps extends NodeProps<WorkflowNodeData> {
  icon?: React.ReactNode;
  color?: string;
  handles?: {
    inputs?: string[];
    outputs?: string[];
  };
}

export const BaseBlockNode = memo(function BaseBlockNode({
  data,
  selected,
  icon,
  color = 'primary',
  handles = { inputs: ['input'], outputs: ['output'] },
}: BaseBlockNodeProps) {
  const hasInputHandle = (handles.inputs || ['input']).length > 0;
  const hasOutputHandle = (handles.outputs || ['output']).length > 0;

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 min-w-[160px] transition-all duration-200 cursor-pointer',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary ring-offset-2'
          : 'border-border bg-card hover:border-primary/50',
      )}
    >
      {/* Input handle */}
      {hasInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            position: 'absolute',
            left: -8,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          className="!w-3 !h-3 !bg-border !border-2 !border-background"
        />
      )}

      {/* Block content */}
      <div className="flex items-center gap-2">
        {icon && (
          <div
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center',
              `bg-${color}/10`,
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{data.label}</p>
        </div>
      </div>

      {/* Output handle */}
      {hasOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            position: 'absolute',
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          className="!w-3 !h-3 !bg-border !border-2 !border-background"
        />
      )}
    </div>
  );
});


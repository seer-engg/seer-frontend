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
  const inputHandles = handles.inputs || ['input'];
  const outputHandles = handles.outputs || ['output'];
  
  // Show labels when there are multiple handles
  const showInputLabels = inputHandles.length > 1;
  const showOutputLabels = outputHandles.length > 1;

  // Calculate dynamic height based on number of handles
  const maxHandles = Math.max(inputHandles.length, outputHandles.length);
  const dynamicHeight = maxHandles > 1 ? Math.max(60, 20 + maxHandles * 24) : undefined;

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 min-w-[160px] transition-all duration-200 cursor-pointer',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary ring-offset-2'
          : 'border-border bg-card hover:border-primary/50',
      )}
      style={dynamicHeight ? { minHeight: `${dynamicHeight}px` } : undefined}
    >
      {/* Input handles */}
      {inputHandles.map((handleId, index) => (
        <div
          key={`input-wrapper-${handleId}`}
          className="absolute flex items-center"
          style={{
            left: 0,
            top: `${20 + index * 24}px`,
          }}
        >
          <Handle
            key={`input-${handleId}`}
            type="target"
            position={Position.Left}
            id={handleId}
            style={{
              position: 'relative',
              left: -8,
              top: 0,
              transform: 'none',
            }}
            className="!w-3 !h-3 !bg-border !border-2 !border-background"
          />
          {showInputLabels && (
            <span className="text-[10px] text-muted-foreground ml-1 select-none">
              {handleId}
            </span>
          )}
        </div>
      ))}

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

      {/* Output handles */}
      {outputHandles.map((handleId, index) => (
        <div
          key={`output-wrapper-${handleId}`}
          className="absolute flex items-center justify-end"
          style={{
            right: 0,
            top: `${20 + index * 24}px`,
          }}
        >
          {showOutputLabels && (
            <span className="text-[10px] text-muted-foreground mr-1 select-none">
              {handleId}
            </span>
          )}
          <Handle
            key={`output-${handleId}`}
            type="source"
            position={Position.Right}
            id={handleId}
            style={{
              position: 'relative',
              right: -8,
              top: 0,
              transform: 'none',
            }}
            className="!w-3 !h-3 !bg-border !border-2 !border-background"
          />
        </div>
      ))}
    </div>
  );
});


import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinueEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: React.CSSProperties;
  data?: {
    showButton?: boolean;
    onContinue?: () => void;
  };
}

function ContinueEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: ContinueEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: data?.showButton ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          strokeWidth: 2,
          strokeDasharray: data?.showButton ? undefined : '5,5',
        }}
      />
      
      {data?.showButton && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={data.onContinue}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ContinueEdge = memo(ContinueEdgeComponent);

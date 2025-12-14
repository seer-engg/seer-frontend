import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NodeStatus } from '@/types/workflow';
import { Check, Loader2, FlaskConical, Play, Zap, CheckCircle, LucideIcon } from 'lucide-react';

interface SubNode {
  id: string;
  label: string;
  status: NodeStatus;
  icon: LucideIcon;
}

interface ExperimentNodeData {
  label: string;
  status: NodeStatus;
  expanded: boolean;
  subNodes: SubNode[];
}

function ExperimentNodeComponent({ data }: { data: ExperimentNodeData }) {
  const status = data.status;
  const isExpanded = data.expanded && (status === 'processing' || status === 'complete');

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all duration-500',
        status === 'idle' && 'bg-card border-primary shadow-md',
        status === 'processing' && 'bg-card border-green-500 node-processing',
        status === 'complete' && 'bg-card border-green-500 shadow-md',
        status === 'disabled' && 'bg-muted/50 border-border opacity-60',
        isExpanded ? 'p-4' : 'px-6 py-4'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />

      {!isExpanded ? (
        <div className="flex items-center gap-3 min-w-[180px]">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              status === 'disabled' ? 'bg-muted' : 'bg-primary/10'
            )}
          >
            <FlaskConical
              className={cn(
                'w-5 h-5',
                status === 'disabled' ? 'text-muted-foreground' : 'text-primary'
              )}
            />
          </div>
          
          <div className="flex-1">
            <p
              className={cn(
                'font-semibold',
                status === 'disabled' ? 'text-muted-foreground' : 'text-foreground'
              )}
            >
              {data.label}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{status}</p>
          </div>
        </div>
      ) : (
        <div className="min-w-[280px]">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{data.label}</span>
          </div>

          <div className="space-y-2">
            {data.subNodes.map((subNode) => {
              const SubIcon = subNode.icon;
              return (
                <div
                  key={subNode.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    subNode.status === 'idle' && 'bg-muted/50 border-border',
                    subNode.status === 'processing' && 'bg-green-500/10 border-green-500',
                    subNode.status === 'complete' && 'bg-green-500/10 border-green-500',
                    subNode.status === 'disabled' && 'bg-muted/30 border-border opacity-50'
                  )}
                >
                  <SubIcon className={cn(
                    'w-4 h-4',
                    subNode.status === 'complete' ? 'text-green-500' : 'text-muted-foreground'
                  )} />
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {subNode.label}
                  </span>
                  {subNode.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  )}
                  {subNode.status === 'complete' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="absolute -bottom-2 -right-2">
          {status === 'processing' && (
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center loader-rotate">
              <Loader2 className="w-4 h-4 text-white" />
            </div>
          )}
          {status === 'complete' && (
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
}

export const ExperimentNode = memo(ExperimentNodeComponent);

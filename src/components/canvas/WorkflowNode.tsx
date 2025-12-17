import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NodeStatus } from '@/types/workflow';
import { Check, Loader2, Bot, TestTube, FlaskConical, BookOpen } from 'lucide-react';

interface WorkflowNodeData {
  label: string;
  status: NodeStatus;
  type: 'agentSpec' | 'evals' | 'experiment' | 'codex';
  selected?: boolean;
  onSelect?: () => void;
}

const icons = {
  agentSpec: Bot,
  evals: TestTube,
  experiment: FlaskConical,
  codex: BookOpen,
};

function WorkflowNodeComponent({ data }: { data: WorkflowNodeData }) {
  const Icon = icons[data.type];
  const status = data.status;
  const isSelected = data.selected;

  return (
    <div
      className={cn(
        'relative px-6 py-4 rounded-xl border-2 min-w-[180px] transition-all duration-300 cursor-pointer',
        status === 'idle' && 'bg-card border-primary shadow-md',
        status === 'processing' && 'bg-card border-green-500 node-processing',
        status === 'complete' && 'bg-card border-green-500 shadow-md',
        status === 'disabled' && 'bg-muted/50 border-border opacity-60',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
      
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            status === 'disabled' ? 'bg-muted' : 'bg-primary/10'
          )}
        >
          <Icon
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

        {/* Status indicator */}
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
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);

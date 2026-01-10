import { cn } from '@/lib/utils';
import type { WorkflowNodeTrace } from './types';
import {
  formatDuration,
  getNodeTypeColors,
  getNodeStatusBorderColor,
} from './timing-utils';

function getNodeIcon(nodeType: string): string {
  const type = nodeType.toLowerCase();
  if (type.includes('tool')) return '🔧';
  if (type.includes('llm') || type.includes('agent')) return '🤖';
  if (type.includes('if') || type.includes('condition')) return '🔀';
  if (type.includes('loop') || type.includes('for')) return '🔁';
  return '⚙️';
}

interface TimelineHeaderProps {
  timeMarkers: number[];
  totalDuration: number;
}

export function TimelineHeader({ timeMarkers, totalDuration }: TimelineHeaderProps) {
  return (
    <div className="pl-36">
      <div className="relative h-6 border-b border-border">
        {timeMarkers.map((time, index) => {
          const position = totalDuration > 0 ? (time / totalDuration) * 100 : 0;
          return (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${position}%` }}
            >
              <div className="h-2 w-px bg-border" />
              <span className="text-[9px] text-muted-foreground mt-0.5">
                {formatDuration(time)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WaterfallBarProps {
  node: WorkflowNodeTrace & { duration: number; startOffset: number };
  index: number;
  totalDuration: number;
  timeMarkers: number[];
  isExpanded: boolean;
  onBarClick: (nodeId: string) => void;
}

export function WaterfallBar({
  node,
  index,
  totalDuration,
  timeMarkers,
  isExpanded,
  onBarClick,
}: WaterfallBarProps) {
  const hasError = !!node.error;
  const widthPercent = totalDuration > 0 ? (node.duration / totalDuration) * 100 : 0;
  const leftPercent = totalDuration > 0 ? (node.startOffset / totalDuration) * 100 : 0;
  const minWidthPercent = 2;
  const displayWidthPercent = Math.max(widthPercent, minWidthPercent);

  return (
    <div className="flex items-center gap-2 group">
      <div className="w-32 shrink-0 text-xs text-muted-foreground truncate">
        <span className="mr-1">{getNodeIcon(node.node_type)}</span>
        <span className="font-mono">{node.node_id.slice(0, 8)}</span>
      </div>

      <div className="flex-1 relative h-8">
        {timeMarkers.map((_, markerIndex) => {
          const position =
            totalDuration > 0 ? (timeMarkers[markerIndex] / totalDuration) * 100 : 0;
          return (
            <div
              key={markerIndex}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: `${position}%` }}
            />
          );
        })}

        <button
          onClick={() => onBarClick(node.node_id)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-6 rounded transition-all cursor-pointer',
            'flex items-center justify-center text-[10px] font-medium text-white',
            'hover:scale-y-125 hover:shadow-md hover:z-10',
            isExpanded && 'scale-y-125 shadow-md z-10',
            getNodeTypeColors(node.node_type),
            'border-2',
            getNodeStatusBorderColor(hasError)
          )}
          style={{
            left: `${leftPercent}%`,
            width: `${displayWidthPercent}%`,
            minWidth: '40px',
          }}
          title={`Node ${index + 1}: ${node.node_type}\nDuration: ${formatDuration(node.duration)}\nStart: ${formatDuration(node.startOffset)}`}
        >
          <span className="drop-shadow-md px-1 truncate">
            {formatDuration(node.duration)}
          </span>
        </button>
      </div>
    </div>
  );
}

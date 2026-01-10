import { useState } from 'react';
import { TraceNodeCard } from './TraceNodeCard';
import { TimelineHeader, WaterfallBar } from './TimelineComponents';
import type { WorkflowNodeTrace } from './types';
import {
  calculateNodeTiming,
  calculateTotalDuration,
  generateTimeMarkers,
} from './timing-utils';

interface WaterfallTimelineProps {
  nodes: WorkflowNodeTrace[];
  startTime?: string | null;
  endTime?: string | null;
}

export function WaterfallTimeline({ nodes, startTime, endTime }: WaterfallTimelineProps) {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const nodesWithTiming = calculateNodeTiming(nodes, startTime);
  const totalDuration = calculateTotalDuration(startTime, endTime);
  const timeMarkers = generateTimeMarkers(totalDuration, 6);

  if (!startTime || totalDuration === 0 || nodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Timing data not available for waterfall view
        </p>
        {nodes.length > 0 && (
          <div className="mt-4 space-y-2">
            {nodes.map((node, index) => (
              <TraceNodeCard key={node.node_id} node={node} index={index} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleBarClick = (nodeId: string) => {
    setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const expandedNode = expandedNodeId
    ? nodes.find((n) => n.node_id === expandedNodeId)
    : null;
  const expandedNodeIndex = expandedNode
    ? nodes.findIndex((n) => n.node_id === expandedNodeId)
    : -1;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Execution Timeline ({nodes.length} nodes)
        </h3>

        <TimelineHeader timeMarkers={timeMarkers} totalDuration={totalDuration} />

        <div className="space-y-1.5">
          {nodesWithTiming.map((node, index) => (
            <WaterfallBar
              key={node.node_id}
              node={node}
              index={index}
              totalDuration={totalDuration}
              timeMarkers={timeMarkers}
              isExpanded={expandedNodeId === node.node_id}
              onBarClick={handleBarClick}
            />
          ))}
        </div>
      </div>

      {expandedNode && expandedNodeIndex !== -1 && (
        <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
          <TraceNodeCard node={expandedNode} index={expandedNodeIndex} />
        </div>
      )}
    </div>
  );
}

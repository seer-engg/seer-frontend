/**
 * Tool Block Node Component
 * 
 * Displays integration tool blocks with OAuth connection status.
 * Shows connect button for tools requiring authorization.
 */
import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, type Node as FlowNode } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { useToolIntegration } from '@/hooks/useToolIntegration';
import { useToolIntegrationStatus } from '@/hooks/useToolIntegrationStatus';
import { useToolSummaryConfig } from '@/hooks/useToolSummaryConfig';
import type { ToolMetadata } from '@/stores/toolsStore';
import { backendApiClient } from '@/lib/api-client';
import { useWorkflowSave } from '@/hooks/useWorkflowSave';
import { ToolBlockNodeContent } from './ToolBlockNodeContent';
import { WorkflowNodeSummary } from './NodeSummary';

type WorkflowNode = FlowNode<WorkflowNodeData>;

export const ToolBlockNode = memo(function ToolBlockNode(
  props: NodeProps<WorkflowNode>
) {
  const { data, selected, id } = props;
  
  // Get tool name from config (if available) or use a default
  const toolName = data.config?.tool_name || data.config?.toolName || '';
  
  // Fetch tool schema to determine dynamic handles
  const { data: toolSchema } = useQuery<ToolMetadata | undefined>({
    queryKey: ['tool-schema', toolName],
    queryFn: async () => {
      if (!toolName) return undefined;
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools.find(t => t.name === toolName);
    },
    enabled: !!toolName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get integration status for this tool
  const { status, isLoading, initiateAuth } = useToolIntegration(toolName);
  const { saveWorkflow, hasWorkflow } = useWorkflowSave();

  // Handle connect button click
  const handleConnect = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    if (hasWorkflow) {
      await saveWorkflow();
    }
    const redirectUrl = await initiateAuth();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [initiateAuth, hasWorkflow, saveWorkflow]);

  // Determine integration status display
  const { icon, statusBadge, needsAuth } = useToolIntegrationStatus(toolName, status, isLoading);

  // Get summary configuration
  const { paramsSummaryConfig, summaryPriorityKeys } = useToolSummaryConfig(data, toolSchema);

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 min-w-[180px] transition-[border,shadow,ring] duration-200 cursor-pointer select-none inline-block',
        selected
          ? 'border-primary shadow-lg ring-2 ring-primary ring-offset-2'
          : 'border-border bg-card hover:border-primary/50',
        needsAuth && !selected && 'border-amber-500/50',
      )}
    >
      {/* Single input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          position: 'absolute',
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />

      {/* Block content */}
      <ToolBlockNodeContent
        icon={icon}
        isLoading={isLoading}
        needsAuth={needsAuth}
        label={data.label}
        statusBadge={statusBadge}
        handleConnect={handleConnect}
      />

      <WorkflowNodeSummary
        config={paramsSummaryConfig}
        priorityKeys={summaryPriorityKeys}
        fallbackMessage="Add required parameters"
      />

      {/* Single output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
});

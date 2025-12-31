/**
 * Tool Block Node Component
 * 
 * Displays integration tool blocks with OAuth connection status.
 * Shows connect button for tools requiring authorization.
 */
import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, type Node as FlowNode } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { WorkflowNodeData } from '../types';
import { useToolIntegration, ToolMetadata } from '@/hooks/useIntegrationTools';
import { backendApiClient } from '@/lib/api-client';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IntegrationType } from '@/lib/integrations/client';
import { GmailSVG } from '@/components/icons/gmail';
import { GoogleDriveSVG } from '@/components/icons/googledrive';
import { GoogleSheetsSVG } from '@/components/icons/googlesheets';
import { GitHubSVG } from '@/components/icons/github';
import { InlineBlockConfig } from '../InlineBlockConfig';

/**
 * Get icon for integration type
 */
function getIntegrationIcon(integrationType: IntegrationType | null) {
  const key = integrationType?.toLowerCase() ?? '';
  switch (key) {
    case 'gmail':
      return <GmailSVG width={16} height={16} />;
    case 'google_drive':
    case 'googledrive':
      return <GoogleDriveSVG width={16} height={16} />;
    case 'google_sheets':
    case 'googlesheets':
      return <GoogleSheetsSVG width={16} height={16} />;
    case 'github':
    case 'pull_request':
      return <GitHubSVG width={16} height={16} />;
    default:
      return <Wrench className="w-4 h-4" />;
  }
}

/**
 * Get display name for integration type
 */
function getIntegrationDisplayName(integrationType: IntegrationType | null): string {
  const key = integrationType?.toLowerCase() ?? '';
  switch (key) {
    case 'gmail':
      return 'Gmail';
    case 'google_drive':
    case 'googledrive':
      return 'Google Drive';
    case 'google_sheets':
    case 'googlesheets':
      return 'Google Sheets';
    case 'pull_request':
      return 'GitHub Pull Requests';
    case 'github':
      return 'GitHub';
    case 'asana':
      return 'Asana';
    case 'sandbox':
      return 'Sandbox';
    default:
      return 'Tool';
  }
}

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

  // Handle connect button click
  const handleConnect = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    const redirectUrl = await initiateAuth();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [initiateAuth]);

  // Determine integration status display
  const { icon, statusBadge, needsAuth } = useMemo(() => {
    if (!toolName || isLoading) {
      return {
        icon: <Wrench className="w-4 h-4 text-primary" />,
        statusBadge: null,
        needsAuth: false,
      };
    }

    if (!status) {
      return {
        icon: <Wrench className="w-4 h-4 text-primary" />,
        statusBadge: null,
        needsAuth: false,
      };
    }

    const intIcon = getIntegrationIcon(status.integrationType);
    const displayName = getIntegrationDisplayName(status.integrationType);

    // No OAuth required
    if (!status.integrationType) {
      return {
        icon: intIcon,
        statusBadge: null,
        needsAuth: false,
      };
    }

    // Connected
    if (status.isConnected) {
      return {
        icon: intIcon,
        statusBadge: (
          <Badge 
            variant="secondary" 
            className="flex items-center gap-1 text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          >
            <CheckCircle2 className="w-3 h-3" />
          </Badge>
        ),
        needsAuth: false,
      };
    }

    // Needs authorization
    return {
      icon: intIcon,
      statusBadge: (
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1 text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        >
          <AlertTriangle className="w-3 h-3" />
          Not connected
        </Badge>
      ),
      needsAuth: true,
    };
  }, [toolName, status, isLoading]);

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
      <div className="space-y-2">
        {/* Icon, tool name, and status row */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center shrink-0',
              needsAuth ? 'bg-amber-500/10' : 'bg-primary/10',
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <div className={cn(needsAuth ? 'text-amber-600 dark:text-amber-400' : 'text-primary')}>
                {icon}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{data.label}</p>
          </div>
          {statusBadge && (
            <div className="flex items-center gap-2">
              <div className="shrink-0">
                {statusBadge}
              </div>
              {needsAuth && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                  onClick={handleConnect}
                >
                  Connect
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <InlineBlockConfig nodeId={id} />

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

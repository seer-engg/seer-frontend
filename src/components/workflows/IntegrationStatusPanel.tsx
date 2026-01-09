/**
 * Integration Status Panel
 * 
 * Shows the connection status of all integrations used in the workflow.
 * Allows users to connect missing integrations directly from the panel.
 */
import { useMemo } from 'react';
import { Node } from '@xyflow/react';
import { IntegrationType } from '@/lib/integrations/client';
import { useToolsStore } from '@/stores/toolsStore';
import { cn } from '@/lib/utils';
import { getToolNamesFromNodes } from './WorkflowCanvas';
import type { WorkflowNodeData } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Mail,
  FolderOpen,
  Github,
  Database,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Sparkles,
  RefreshCw,
  Plug,
  GitPullRequest,
} from 'lucide-react';

interface IntegrationStatusPanelProps {
  /** Tool names used in the current workflow */
  usedToolNames?: string[];
  /** Workflow nodes to extract tool names from */
  nodes?: Node<WorkflowNodeData>[];
  /** Whether to show all integrations or only those used */
  showAll?: boolean;
  /** Compact mode for sidebar display */
  compact?: boolean;
  className?: string;
}

interface IntegrationInfo {
  type: IntegrationType;
  displayName: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isUsed: boolean;
  toolCount: number;
}

const INTEGRATION_META: Record<IntegrationType, { displayName: string; icon: React.ReactNode }> = {
  gmail: { displayName: 'Gmail', icon: <Mail className="w-4 h-4" /> },
  google_drive: { displayName: 'Google Drive', icon: <FolderOpen className="w-4 h-4" /> },
  google_sheets: { displayName: 'Google Sheets', icon: <FolderOpen className="w-4 h-4" /> },
  github: { displayName: 'GitHub', icon: <Github className="w-4 h-4" /> },
  pull_request: { displayName: 'GitHub Pull Requests', icon: <GitPullRequest className="w-4 h-4" /> },
  asana: { displayName: 'Asana', icon: <Plug className="w-4 h-4" /> },
  sandbox: { displayName: 'Sandbox', icon: <Sparkles className="w-4 h-4" /> },
  supabase: { displayName: 'Supabase', icon: <Database className="w-4 h-4" /> },
};

export function IntegrationStatusPanel({
  usedToolNames,
  nodes,
  showAll = false,
  compact = false,
  className,
}: IntegrationStatusPanelProps) {
  // Phase 2: Direct store access instead of wrapper hook
  const {
    toolsWithStatus,
    isLoading,
    connectedIntegrations,
    connectIntegration,
    refresh,
  // Phase 2: Direct store access instead of wrapper hook - FIXED: Individual selectors
  const toolsWithStatus = useToolsStore((state) => state.toolsWithStatus);
  const isLoading = useToolsStore((state) => state.toolsLoading);
  const connectedIntegrations = useToolsStore((state) => state.connectedIntegrations);
  const connectIntegration = useToolsStore((state) => state.connectIntegration);
  const refresh = useToolsStore((state) => state.refreshIntegrationTools);
  );

  // Extract tool names from nodes if not provided
  const toolNamesFromNodes = useMemo(() => {
    if (nodes) {
      return getToolNamesFromNodes(nodes);
    }
    return [];
  }, [nodes]);

  // Use provided usedToolNames or extract from nodes
  const effectiveToolNames = usedToolNames || toolNamesFromNodes;

  // Build integration info from tools
  const integrations = useMemo((): IntegrationInfo[] => {
    const integrationMap = new Map<IntegrationType, IntegrationInfo>();

    // Process all tools to find integrations
    for (const tool of toolsWithStatus) {
      if (!tool.integrationType) continue;

      const type = tool.integrationType;
      const meta = INTEGRATION_META[type];
      if (!meta) continue;

      const existing = integrationMap.get(type);
      const isUsed = effectiveToolNames.includes(tool.tool.name);

      if (existing) {
        existing.toolCount++;
        if (isUsed) existing.isUsed = true;
      } else {
        integrationMap.set(type, {
          type,
          displayName: meta.displayName,
          icon: meta.icon,
          isConnected: tool.isConnected,
          isUsed,
          toolCount: 1,
        });
      }
    }

    // Convert to array and sort
    const result = Array.from(integrationMap.values());
    
    // Sort: used first, then connected, then alphabetically
    result.sort((a, b) => {
      if (a.isUsed !== b.isUsed) return b.isUsed ? 1 : -1;
      if (a.isConnected !== b.isConnected) return b.isConnected ? 1 : -1;
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [toolsWithStatus, effectiveToolNames]);

  // Filter to only show relevant integrations
  const displayIntegrations = useMemo(() => {
    if (showAll) return integrations;
    return integrations.filter(i => i.isUsed || i.isConnected);
  }, [integrations, showAll]);

  // Stats
  const connectedCount = integrations.filter(i => i.isConnected).length;
  const usedCount = integrations.filter(i => i.isUsed).length;
  const needsAuthCount = integrations.filter(i => i.isUsed && !i.isConnected).length;

  // Handle connect click
  const handleConnect = async (type: IntegrationType) => {
    // Find tool names for this integration type that are used in the workflow
    const toolsForType = toolsWithStatus.filter(
      t => t.integrationType === type && effectiveToolNames.includes(t.tool.name)
    );
    
    if (toolsForType.length === 0) {
      console.error(`[IntegrationStatusPanel] No tools found for integration type ${type} in workflow. Cannot connect without specific tool names.`);
      return;
    }
    
    const toolNames = toolsForType.map(t => t.tool.name);
    const redirectUrl = await connectIntegration(type, { toolNames });
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading integrations...</span>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Integrations
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={refresh}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh status</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {displayIntegrations.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No integration tools in workflow
          </p>
        ) : (
          <div className="space-y-1">
            {displayIntegrations.map((integration) => (
              <div
                key={integration.type}
                className={cn(
                  'flex items-center justify-between py-1.5 px-2 rounded-md',
                  integration.isUsed && !integration.isConnected
                    ? 'bg-amber-500/10'
                    : 'bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    integration.isConnected ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {integration.icon}
                  </div>
                  <span className="text-sm">{integration.displayName}</span>
                </div>

                {integration.isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                    onClick={() => handleConnect(integration.type)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="w-4 h-4" />
              Integrations
            </CardTitle>
            <CardDescription className="mt-1">
              {needsAuthCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {needsAuthCount} integration{needsAuthCount !== 1 ? 's' : ''} need{needsAuthCount === 1 ? 's' : ''} connection
                </span>
              ) : connectedCount > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  All integrations connected
                </span>
              ) : (
                'Connect integrations to use tools'
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {displayIntegrations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Plug className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No integration tools in workflow</p>
            <p className="text-xs mt-1">Add a tool block to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayIntegrations.map((integration) => (
              <div
                key={integration.type}
                className={cn(
                  'flex items-center justify-between py-2.5 px-3 rounded-lg border',
                  integration.isUsed && !integration.isConnected
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : integration.isConnected
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-muted/30 border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      integration.isConnected
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {integration.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{integration.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {integration.toolCount} tool{integration.toolCount !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {integration.isUsed && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 h-5"
                    >
                      In use
                    </Badge>
                  )}
                  
                  {integration.isConnected ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 text-[10px] px-1.5 h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Ready to use {integration.displayName} tools
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      size="sm"
                      variant={integration.isUsed ? 'default' : 'outline'}
                      className={cn(
                        'h-7 text-xs',
                        integration.isUsed && 'bg-amber-500 hover:bg-amber-600 text-white'
                      )}
                      onClick={() => handleConnect(integration.type)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline status badge for a single integration
 */
export function IntegrationBadge({
  type,
  toolNames,
  showConnect = true,
  className
}: {
  type: IntegrationType;
  toolNames?: string[];
  showConnect?: boolean;
  className?: string;
}) {
  // Phase 2: Direct store access instead of wrapper hook
  // Phase 2: Direct store access instead of wrapper hook - FIXED: Individual selectors
  const isIntegrationConnected = useToolsStore((state) => state.isIntegrationConnected);
  const connectIntegration = useToolsStore((state) => state.connectIntegration);
  const isLoading = useToolsStore((state) => state.toolsLoading);
  const isConnected = isIntegrationConnected(type);
  const meta = INTEGRATION_META[type];

  if (!meta) return null;

  const handleConnect = async () => {
    if (!toolNames || toolNames.length === 0) {
      console.error(`[IntegrationBadge] Cannot connect ${type} without explicit tool names. Pass toolNames prop.`);
      return;
    }
    
    const redirectUrl = await connectIntegration(type, { toolNames });
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  if (isLoading) {
    return (
      <Badge variant="secondary" className={cn('animate-pulse', className)}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        {meta.displayName}
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {meta.displayName}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 cursor-pointer hover:bg-amber-500/20',
        className
      )}
      onClick={showConnect ? handleConnect : undefined}
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      {meta.displayName}
      {showConnect && <ExternalLink className="w-3 h-3 ml-1" />}
    </Badge>
  );
}


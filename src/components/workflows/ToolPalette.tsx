/**
 * Tool Palette Component
 * 
 * Displays available tools and built-in blocks.
 * Supports drag-and-drop to canvas.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GmailIcon } from '@/components/icons/gmail';
import { GoogleDriveIcon } from '@/components/icons/googledrive';
import { GoogleSheetsIcon } from '@/components/icons/googlesheets';
import { GitHubIcon } from '@/components/icons/github';
import { Search, Sparkles, GitBranch, Repeat, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Clock, FileEdit, Trash2, Play, Check, X, Globe, Wrench, GitPullRequest, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendApiClient } from '@/lib/api-client';

interface Tool {
  name: string;
  description: string;
  toolkit?: string;
  slug?: string;
  provider?: string;  // OAuth provider (e.g., 'google', 'github')
  integration_type?: string;  // Integration type (e.g., 'gmail', 'google_sheets')
}

interface BuiltInBlock {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const BUILT_IN_BLOCKS: BuiltInBlock[] = [
  {
    type: 'llm',
    label: 'LLM',
    description: 'Invoke LLM with system prompt',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    type: 'if_else',
    label: 'If/Else',
    description: 'Conditional logic',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    type: 'for_loop',
    label: 'For Loop',
    description: 'Iterate over array',
    icon: <Repeat className="w-4 h-4" />,
  },
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: <ArrowRight className="w-4 h-4" />,
  },
];

interface ToolPaletteProps {
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  className?: string;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  workflows?: Array<{
    id: number;
    name: string;
    updated_at: string;
    graph_data?: any;
  }>;
  isLoadingWorkflows?: boolean;
  selectedWorkflowId?: number | null;
  onLoadWorkflow?: (workflow: any) => void;
  onDeleteWorkflow?: (workflowId: number) => void;
  onRenameWorkflow?: (workflowId: number, newName: string) => Promise<void>;
  onExecuteWorkflow?: (workflowId: number, inputData: Record<string, any>, stream: boolean) => Promise<any>;
  onNewWorkflow?: () => void;
  isExecuting?: boolean;
}

export function ToolPalette({ 
  onBlockSelect, 
  className, 
  collapsed: externalCollapsed, 
  onCollapseChange,
  workflows = [],
  isLoadingWorkflows = false,
  selectedWorkflowId,
  onLoadWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
  onExecuteWorkflow,
  onNewWorkflow,
  isExecuting = false,
}: ToolPaletteProps) {
  // Always use external prop when provided, default to false
  // Don't use internal state when external prop is passed to avoid conflicts
  const collapsed = externalCollapsed ?? false;
  
  const setCollapsed = (value: boolean) => {
    onCollapseChange?.(value);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Fetch tools
  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ tools: Tool[] }>('/api/tools', {
        method: 'GET',
      });
      return response;
    },
  });

  const tools = toolsData?.tools || [];
  
  // Group tools by provider (for OAuth grouping)
  const toolsByProvider = tools.reduce((acc, tool) => {
    const provider = tool.provider || 'other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const providers = Object.keys(toolsByProvider);

  // Filter tools by search query and selected provider
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = !selectedProvider || tool.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const filteredBlocks = BUILT_IN_BLOCKS.filter(
    (block) =>
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBlockClick = (block: BuiltInBlock | Tool, isTool: boolean) => {
    if (onBlockSelect) {
      if (isTool) {
        const tool = block as Tool;
        onBlockSelect({
          type: 'tool',
          label: tool.name,
          config: {
            tool_name: tool.slug || tool.name,
            provider: tool.provider,  // Include provider for OAuth connections
            integration_type: tool.integration_type,
            params: {},
          },
        });
      } else {
        const builtInBlock = block as BuiltInBlock;
        onBlockSelect({
          type: builtInBlock.type,
          label: builtInBlock.label,
        });
      }
    }
  };

  const formatGroupLabel = (value: string) => {
    const normalized = value.replace(/[_-]+/g, ' ').trim();
    if (!normalized) return 'Other';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const normalizeIntegrationTypeKey = (value: string) => {
    return value.toLowerCase().trim();
  };

  const getProviderIcon = (provider: string) => {
    const p = provider.toLowerCase();
    switch (p) {
      case 'google':
        return <Globe className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'github':
        return <GitHubIcon className="w-3.5 h-3.5 text-muted-foreground" />;
      default:
        return <Plug className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getIntegrationTypeIcon = (integrationType: string) => {
    const key = normalizeIntegrationTypeKey(integrationType);
    switch (key) {
      case 'gmail':
        return <GmailIcon className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'googledrive':
      case 'google_drive':
        return <GoogleDriveIcon className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'googlesheets':
      case 'google_sheets':
        return <GoogleSheetsIcon className="w-3.5 h-3.5 text-muted-foreground" />;
      case 'pull_request':
        return <GitPullRequest className="w-3.5 h-3.5 text-muted-foreground" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getIntegrationTypeLabel = (integrationType: string) => {
    const key = normalizeIntegrationTypeKey(integrationType);
    switch (key) {
      case 'gmail':
        return 'Gmail';
      case 'googledrive':
      case 'google_drive':
        return 'Google Drive';
      case 'googlesheets':
      case 'google_sheets':
        return 'Google Sheets';
      case 'pull_request':
        return 'Pull Requests';
      default:
        return formatGroupLabel(integrationType);
    }
  };

  const handleStartRename = (e: React.MouseEvent, workflow: typeof workflows[0]) => {
    e.stopPropagation();
    setEditingWorkflowId(workflow.id);
    setEditingName(workflow.name);
  };

  const handleCancelRename = () => {
    setEditingWorkflowId(null);
    setEditingName('');
  };

  const handleSaveRename = async (workflowId: number) => {
    if (!onRenameWorkflow || !editingName.trim()) {
      handleCancelRename();
      return;
    }

    const trimmedName = editingName.trim();
    if (trimmedName === workflows.find(w => w.id === workflowId)?.name) {
      handleCancelRename();
      return;
    }

    setIsRenaming(true);
    try {
      await onRenameWorkflow(workflowId, trimmedName);
      setEditingWorkflowId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      // Keep editing state on error so user can retry
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, workflowId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(workflowId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-card border-r w-full transition-all duration-200', className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Blocks</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-6 w-6"
            title="Collapse palette"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 text-left">
          {/* Workflows Section */}
          {!collapsed && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Workflows</h3>
                {onNewWorkflow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNewWorkflow}
                    className="h-6 text-xs px-2"
                  >
                    + New
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {isLoadingWorkflows ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Loading workflows...
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No saved workflows yet
                  </div>
                ) : (
                  workflows.map((workflow) => (
                    <Card
                      key={workflow.id}
                      className={cn(
                        'cursor-pointer hover:bg-accent transition-colors',
                        selectedWorkflowId === workflow.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => {
                        if (editingWorkflowId !== workflow.id) {
                          onLoadWorkflow?.(workflow);
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {editingWorkflowId === workflow.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleSaveRename(workflow.id)}
                                onKeyDown={(e) => handleRenameKeyDown(e, workflow.id)}
                                className="h-7 text-sm"
                                disabled={isRenaming}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <p className="text-sm font-medium truncate">{workflow.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(workflow.updated_at).toLocaleDateString()}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            {editingWorkflowId === workflow.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-green-600 hover:text-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveRename(workflow.id);
                                  }}
                                  disabled={isRenaming}
                                  title="Save"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelRename();
                                  }}
                                  disabled={isRenaming}
                                  title="Cancel"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {onRenameWorkflow && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => handleStartRename(e, workflow)}
                                    title="Rename workflow"
                                  >
                                    <FileEdit className="h-3 w-3" />
                                  </Button>
                                )}
                                {onExecuteWorkflow && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onExecuteWorkflow(workflow.id, {}, false);
                                    }}
                                    disabled={isExecuting}
                                    title="Run workflow"
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                                {onDeleteWorkflow && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteWorkflow(workflow.id);
                                    }}
                                    title="Delete workflow"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Blocks */}
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search blocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <h3 className="text-sm font-medium mb-2">Blocks</h3>
            <div className="space-y-2">
              {filteredBlocks.map((block) => (
                <Card
                  key={block.type}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleBlockClick(block, false)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {block.icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{block.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {block.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Integration Tools */}
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading tools...</div>
          ) : (
            <div>
              <h3 className="text-sm font-medium mb-2">Integration Tools</h3>
              {Object.entries(toolsByProvider).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(toolsByProvider)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([provider, providerTools]) => {
                    const filteredProviderTools = providerTools.filter((tool) => {
                      const matchesSearch =
                        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesProvider = !selectedProvider || tool.provider === selectedProvider;
                      return matchesSearch && matchesProvider;
                    });

                    if (filteredProviderTools.length === 0) return null;

                    const toolsByIntegrationType = filteredProviderTools.reduce((acc, tool) => {
                      const integrationType = tool.integration_type || 'other';
                      if (!acc[integrationType]) acc[integrationType] = [];
                      acc[integrationType].push(tool);
                      return acc;
                    }, {} as Record<string, Tool[]>);

                    return (
                      <div key={provider}>
                        <Collapsible defaultOpen>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="group w-full flex items-center justify-between text-left mb-2 px-2 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getProviderIcon(provider)}
                                <h4 className="text-xs font-semibold mb-0 capitalize text-muted-foreground">
                                  {provider}
                                </h4>
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                  {filteredProviderTools.length}
                                </Badge>
                              </div>
                              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 ml-3 pl-3 border-l border-border/60">
                            {Object.entries(toolsByIntegrationType)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([integrationType, integrationTools]) => (
                                <Collapsible key={`${provider}:${integrationType}`} defaultOpen>
                                  <CollapsibleTrigger asChild>
                                    <button
                                      type="button"
                                      className="group w-full flex items-center justify-between text-left px-2 py-1 rounded-md bg-background hover:bg-accent border border-border/40 transition-colors"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {getIntegrationTypeIcon(integrationType)}
                                        <span className="text-xs font-medium text-foreground truncate">
                                          {getIntegrationTypeLabel(integrationType)}
                                        </span>
                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                          {integrationTools.length}
                                        </Badge>
                                      </div>
                                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="ml-3 pl-3 border-l border-border/40">
                                    <Table className="mt-1">
                                      <TableBody>
                                        {integrationTools.map((tool) => (
                                          <TableRow
                                            key={tool.slug || tool.name}
                                            className="cursor-pointer hover:bg-accent/60"
                                            onClick={() => handleBlockClick(tool, true)}
                                          >
                                            <TableCell className="p-2">
                                              <p className="text-sm font-medium">{tool.name}</p>
                                              {tool.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                  {tool.description}
                                                </p>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                  {filteredTools.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No tools found
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No tools available
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


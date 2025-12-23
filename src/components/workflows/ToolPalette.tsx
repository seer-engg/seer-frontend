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
import { Search, Wrench, Code, Sparkles, GitBranch, Repeat, ArrowRight, ChevronLeft, ChevronRight, Clock, FileEdit, Trash2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendApiClient } from '@/lib/api-client';

interface Tool {
  name: string;
  description: string;
  toolkit?: string;
  slug?: string;
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
    type: 'code',
    label: 'Code',
    description: 'Execute Python code',
    icon: <Code className="w-4 h-4" />,
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
  const [selectedToolkit, setSelectedToolkit] = useState<string | null>(null);

  // Fetch tools
  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools', selectedToolkit],
    queryFn: async () => {
      const url = selectedToolkit
        ? `/api/tools?integration_type=${selectedToolkit}`
        : '/api/tools';
      const response = await backendApiClient.request<{ tools: Tool[] }>(url, {
        method: 'GET',
      });
      return response;
    },
  });

  const tools = toolsData?.tools || [];
  
  // Group tools by toolkit
  const toolsByToolkit = tools.reduce((acc, tool) => {
    const toolkit = tool.toolkit || 'other';
    if (!acc[toolkit]) {
      acc[toolkit] = [];
    }
    acc[toolkit].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const toolkits = Object.keys(toolsByToolkit);

  // Filter tools and blocks by search query
  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="p-4 space-y-6">
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
                      onClick={() => onLoadWorkflow?.(workflow)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{workflow.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(workflow.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
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
                                  if (confirm(`Delete "${workflow.name}"?`)) {
                                    onDeleteWorkflow(workflow.id);
                                  }
                                }}
                                title="Delete workflow"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
              {toolkits.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Badge
                    variant={selectedToolkit === null ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedToolkit(null)}
                  >
                    All
                  </Badge>
                  {toolkits.map((toolkit) => (
                    <Badge
                      key={toolkit}
                      variant={selectedToolkit === toolkit ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedToolkit(toolkit)}
                    >
                      {toolkit}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {filteredTools.map((tool) => (
                  <Card
                    key={tool.slug || tool.name}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleBlockClick(tool, true)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tool.name}
                          </p>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                          {tool.toolkit && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {tool.toolkit}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTools.length === 0 && !isLoading && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No tools found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


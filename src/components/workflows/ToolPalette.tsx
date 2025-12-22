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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Wrench, Code, Sparkles, GitBranch, Repeat, Database, ArrowRight, ArrowLeft } from 'lucide-react';
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
    type: 'variable',
    label: 'Variable',
    description: 'Store/retrieve values',
    icon: <Database className="w-4 h-4" />,
  },
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: <ArrowRight className="w-4 h-4" />,
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Workflow exit point',
    icon: <ArrowLeft className="w-4 h-4" />,
  },
];

interface ToolPaletteProps {
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  className?: string;
}

export function ToolPalette({ onBlockSelect, className }: ToolPaletteProps) {
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
    <div className={cn('flex flex-col h-full bg-card border-r', className)}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Blocks</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Built-in Blocks */}
          <div>
            <h3 className="text-sm font-medium mb-2">Built-in Blocks</h3>
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


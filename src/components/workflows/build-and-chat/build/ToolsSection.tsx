import { useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { getIntegrationTypeIcon, getIntegrationTypeLabel, getProviderIcon } from '../utils';
import type { Tool } from '../types';

interface ToolsSectionProps {
  tools: Tool[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedProvider: string | null;
  onSelectTool: (tool: Tool) => void;
  isLoading: boolean;
}

export function ToolsSection({
  tools,
  searchQuery,
  onSearchChange,
  selectedProvider,
  onSelectTool,
  isLoading,
}: ToolsSectionProps) {
  const toolsByProvider = useMemo(() => {
    return tools.reduce((acc, tool) => {
      const provider = tool.provider || 'other';
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = !selectedProvider || tool.provider === selectedProvider;
      return matchesSearch && matchesProvider;
    });
  }, [tools, searchQuery, selectedProvider]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tools...</div>;
  }

  if (tools.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No tools available
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2 text-left">Tools</h3>
      <div className="relative mb-4">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
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
                          <h4 className="text-xs font-semibold capitalize text-muted-foreground">
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
                                    <Tooltip key={tool.slug || tool.name}>
                                      <TooltipTrigger asChild>
                                        <TableRow
                                          className="cursor-pointer hover:bg-accent/60"
                                          onClick={() => onSelectTool(tool)}
                                        >
                                          <TableCell className="p-2 text-left">
                                            <p className="text-sm font-medium">{tool.name}</p>
                                          </TableCell>
                                        </TableRow>
                                      </TooltipTrigger>
                                      {tool.description && (
                                        <TooltipContent>
                                          <p>{tool.description}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
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
            <div className="text-sm text-muted-foreground text-center py-4">No tools found</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">No tools available</div>
      )}
    </div>
  );
}


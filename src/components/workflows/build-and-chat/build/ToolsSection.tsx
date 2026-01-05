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

import { getIntegrationTypeIcon, getIntegrationTypeLabel } from '../utils';
import type { Tool } from '../types';

interface ToolsSectionProps {
  tools: Tool[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectTool: (tool: Tool) => void;
  isLoading: boolean;
}

export function ToolsSection({
  tools,
  searchQuery,
  onSearchChange,
  onSelectTool,
  isLoading,
}: ToolsSectionProps) {
  // Normalize integration type: merge pull_request into github
  const normalizeIntegrationType = (integrationType: string | undefined): string => {
    if (!integrationType) return 'other';
    const key = integrationType.toLowerCase().trim();
    if (key === 'pull_request') return 'github';
    return key;
  };

  // Group tools by normalized integration type
  const toolsByIntegrationType = useMemo(() => {
    return tools.reduce((acc, tool) => {
      const normalizedType = normalizeIntegrationType(tool.integration_type);
      if (!acc[normalizedType]) {
        acc[normalizedType] = [];
      }
      acc[normalizedType].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);
  }, [tools]);

  // Filter tools by search query
  const filteredToolsByType = useMemo(() => {
    const filtered: Record<string, Tool[]> = {};
    for (const [integrationType, typeTools] of Object.entries(toolsByIntegrationType)) {
      const filteredTools = typeTools.filter((tool) => {
        return (
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      if (filteredTools.length > 0) {
        filtered[integrationType] = filteredTools;
      }
    }
    return filtered;
  }, [toolsByIntegrationType, searchQuery]);

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
          className="pl-8 text-sm"
        />
      </div>
      {Object.keys(filteredToolsByType).length > 0 ? (
        <div>
          {Object.entries(filteredToolsByType)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([integrationType, integrationTools]) => (
              <Collapsible key={integrationType}>
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
                <CollapsibleContent className="ml-1 border-l border-border/40">
                  <Table>
                    <TableBody>
                      {integrationTools.map((tool) => (
                        <Tooltip key={tool.slug || tool.name}>
                          <TooltipTrigger asChild>
                            <TableRow
                              className="cursor-pointer hover:bg-accent/60"
                              onClick={() => onSelectTool(tool)}
                            >
                              <TableCell className="p-2 text-left">
                                <p className="text-xs font-medium">{tool.name}</p>
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
        </div>
      ) : tools.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No tools available</div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">No tools found</div>
      )}
    </div>
  );
}


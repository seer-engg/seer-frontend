import { useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
        <Accordion type="single" collapsible className="space-y-3">
          {Object.entries(filteredToolsByType)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([integrationType, integrationTools]) => (
              <AccordionItem key={integrationType} value={integrationType}>
                <AccordionTrigger className="w-full flex items-center gap-2 text-left py-2 transition-colors hover:text-foreground [&>svg]:hidden">
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-90 shrink-0" />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getIntegrationTypeIcon(integrationType)}
                    <span className="text-sm font-medium text-foreground truncate">
                      {getIntegrationTypeLabel(integrationType)}
                    </span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] ml-auto">
                      {integrationTools.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="mt-2 ml-6 space-y-1.5">
                  {integrationTools.map((tool) => (
                    <Tooltip key={tool.slug || tool.name}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="w-full justify-start cursor-pointer hover:bg-accent hover:border-accent-foreground/20 transition-colors px-2.5 py-1.5 h-auto font-normal text-xs"
                          onClick={() => onSelectTool(tool)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectTool(tool);
                            }
                          }}
                        >
                          {tool.name}
                        </Badge>
                      </TooltipTrigger>
                      {tool.description && (
                        <TooltipContent>
                          <p>{tool.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      ) : tools.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No tools available</div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">No tools found</div>
      )}
    </div>
  );
}


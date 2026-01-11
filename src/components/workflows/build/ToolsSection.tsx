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
import type { Tool } from '../buildtypes';

interface ToolsSectionProps {
  tools: Tool[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectTool: (tool: Tool) => void;
  isLoading: boolean;
}

const normalizeIntegrationType = (integrationType: string | undefined): string => {
  if (!integrationType) return 'other';
  const key = integrationType.toLowerCase().trim();
  return key === 'pull_request' ? 'github' : key;
};

const groupToolsByType = (tools: Tool[]): Record<string, Tool[]> =>
  tools.reduce((acc, tool) => {
    const type = normalizeIntegrationType(tool.integration_type);
    (acc[type] = acc[type] || []).push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

const filterToolsBySearch = (
  toolsByType: Record<string, Tool[]>,
  query: string
): Record<string, Tool[]> => {
  const result: Record<string, Tool[]> = {};
  for (const [type, typeTools] of Object.entries(toolsByType)) {
    const filtered = typeTools.filter((tool) =>
      tool.name.toLowerCase().includes(query.toLowerCase()) ||
      tool.description?.toLowerCase().includes(query.toLowerCase())
    );
    if (filtered.length > 0) result[type] = filtered;
  }
  return result;
};

export function ToolsSection({
  tools,
  searchQuery,
  onSearchChange,
  onSelectTool,
  isLoading,
}: ToolsSectionProps) {
  const toolsByIntegrationType = useMemo(() => groupToolsByType(tools), [tools]);
  const filteredToolsByType = useMemo(
    () => filterToolsBySearch(toolsByIntegrationType, searchQuery),
    [toolsByIntegrationType, searchQuery]
  );

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

  const ToolItem = ({ tool }: { tool: Tool }) => {
    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: 'tool',
          tool: {
            name: tool.name,
            slug: tool.slug,
            provider: tool.provider,
            integration_type: tool.integration_type,
            output_schema: tool.output_schema,
          },
        })
      );
    };

    return (
      <Tooltip key={tool.slug || tool.name}>
        <TooltipTrigger asChild>
          <Badge
            draggable
            onDragStart={handleDragStart}
            variant="outline"
            className="w-full justify-start cursor-grab active:cursor-grabbing hover:bg-accent transition-colors px-2.5 py-1.5 h-auto font-normal text-xs"
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
        {tool.description && <TooltipContent><p>{tool.description}</p></TooltipContent>}
      </Tooltip>
    );
  };

  const renderAccordionItems = () => Object.entries(filteredToolsByType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, typeTools]) => (
      <AccordionItem key={type} value={type}>
        <AccordionTrigger className="w-full flex items-center gap-2 text-left py-2 transition-colors hover:text-foreground [&>svg]:hidden">
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-90 shrink-0" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getIntegrationTypeIcon(type)}
            <span className="text-sm font-medium text-foreground truncate">{getIntegrationTypeLabel(type)}</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] ml-auto">{typeTools.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="mt-2 ml-6 space-y-1.5">
          {typeTools.map((tool) => <ToolItem key={tool.slug || tool.name} tool={tool} />)}
        </AccordionContent>
      </AccordionItem>
    ));

  return (
    <div>
      <h3 className="text-sm font-medium mb-2 text-left">Tools</h3>
      <div className="relative mb-4">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search tools..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-8 text-sm" />
      </div>
      {Object.keys(filteredToolsByType).length > 0 ? (
        <Accordion type="single" collapsible className="space-y-3">{renderAccordionItems()}</Accordion>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">{tools.length === 0 ? 'No tools available' : 'No tools found'}</div>
      )}
    </div>
  );
}


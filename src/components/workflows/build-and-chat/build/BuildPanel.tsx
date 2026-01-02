import { useMemo, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

import { BUILT_IN_BLOCKS } from '../constants';
import type { BuiltInBlock, Tool } from '../types';
import { BlocksSection } from './BlocksSection';
import { ToolsSection } from './ToolsSection';

interface BuildPanelProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  blocks?: BuiltInBlock[];
  selectedWorkflowId?: string | null;
  isExecuting?: boolean;
}

export function BuildPanel({
  tools,
  isLoadingTools,
  onBlockSelect,
  blocks = BUILT_IN_BLOCKS,
}: BuildPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlocks = useMemo(() => {
    return blocks.filter(
      (block) =>
        block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [blocks, searchQuery]);

  const handleBuiltInSelect = (block: BuiltInBlock) => {
    onBlockSelect?.({
      type: block.type,
      label: block.label,
    });
  };

  const handleToolSelect = (tool: Tool) => {
    onBlockSelect?.({
      type: 'tool',
      label: tool.name,
      config: {
        tool_name: tool.slug || tool.name,
        provider: tool.provider,
        integration_type: tool.integration_type,
        ...(tool.output_schema ? { output_schema: tool.output_schema } : {}),
        params: {},
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <BlocksSection blocks={filteredBlocks} onSelectBlock={handleBuiltInSelect} />
          <ToolsSection
            tools={tools}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectTool={handleToolSelect}
            isLoading={isLoadingTools}
          />
        </div>
      </ScrollArea>
    </div>
  );
}


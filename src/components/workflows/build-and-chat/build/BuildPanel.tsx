import { useMemo, useState } from 'react';
import { Menu } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

import { BUILT_IN_BLOCKS } from '../constants';
import type { BuiltInBlock, Tool } from '../types';
import { BlocksSection } from './BlocksSection';
import { ToolsSection } from './ToolsSection';

interface BuildPanelProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  blocks?: BuiltInBlock[];
  onTriggerClick?: () => void;
  onRunClick?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  selectedWorkflowId?: string | null;
  isExecuting?: boolean;
}

export function BuildPanel({
  tools,
  isLoadingTools,
  onBlockSelect,
  blocks = BUILT_IN_BLOCKS,
  onTriggerClick,
  onRunClick,
  onToggleCollapse,
  isCollapsed,
  selectedWorkflowId,
  isExecuting,
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
        params: {},
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with action buttons */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-2 bg-card shrink-0">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Show Build & Chat panel" : "Hide Build & Chat panel"}
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 flex items-center justify-end gap-2">
          <Button
            onClick={onRunClick}
            disabled={!selectedWorkflowId || isExecuting}
            size="sm"
            variant="default"
          >
            Run
          </Button>
          <Button
            onClick={onTriggerClick}
            disabled={!selectedWorkflowId}
            size="sm"
            variant="outline"
          >
            Triggers
          </Button>
        </div>
      </div>
      
      {/* Scrollable content */}
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


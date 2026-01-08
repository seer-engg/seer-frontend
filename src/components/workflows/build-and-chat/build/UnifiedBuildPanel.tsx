import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { BUILT_IN_BLOCKS } from '../constants';
import type { BuiltInBlock, Tool, UnifiedItem, ItemType } from '../types';
import type { TriggerListOption } from './TriggerSection';
import { UnifiedBuildItem } from './UnifiedBuildItem';
import { TRIGGER_ICON_BY_KEY } from '@/components/workflows/triggers/constants';
import { getIntegrationTypeIcon } from '../utils';

interface UnifiedBuildPanelProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  blocks?: BuiltInBlock[];
  selectedWorkflowId?: string | null;
  triggerOptions?: TriggerListOption[];
  isLoadingTriggers?: boolean;
  triggerInfoMessage?: string;
}

export function UnifiedBuildPanel({
  tools,
  isLoadingTools,
  onBlockSelect,
  blocks = BUILT_IN_BLOCKS,
  triggerOptions = [],
  isLoadingTriggers = false,
}: UnifiedBuildPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Transform all data sources into unified items
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Add blocks
    blocks.forEach((block) => {
      items.push({
        id: `block-${block.type}`,
        type: 'block',
        label: block.label,
        description: block.description,
        icon: block.icon,
        blockType: block.type,
        builtInBlock: block,
        searchTerms: `${block.label} ${block.description}`.toLowerCase(),
      });
    });

    // Add triggers
    triggerOptions.forEach((trigger) => {
      console.log('[UnifiedBuildPanel] Processing trigger:', { 
        key: trigger.key, 
        title: trigger.title, 
        hasPrimaryAction: !!trigger.onPrimaryAction 
      });
      const Icon = TRIGGER_ICON_BY_KEY[trigger.key];
      items.push({
        id: `trigger-${trigger.key}`,
        type: 'trigger',
        label: trigger.title,
        description: trigger.description || undefined,
        icon: Icon ? <Icon className="w-4 h-4" /> : <span className="text-xs font-semibold">T</span>,
        triggerKey: trigger.key,
        status: trigger.status,
        badge: trigger.badge,
        actionLabel: trigger.actionLabel,
        secondaryActionLabel: trigger.secondaryActionLabel,
        disabled: trigger.disabled,
        disabledReason: trigger.disabledReason,
        onPrimaryAction: trigger.onPrimaryAction,
        onSecondaryAction: trigger.onSecondaryAction,
        isPrimaryActionLoading: trigger.isPrimaryActionLoading,
        isSecondaryActionLoading: trigger.isSecondaryActionLoading,
        searchTerms: `${trigger.title} ${trigger.description || ''}`.toLowerCase(),
      });
    });

    // Add actions (renamed from tools)
    tools.forEach((tool) => {
      const integrationType = tool.integration_type || 'other';
      items.push({
        id: `action-${tool.slug || tool.name}`,
        type: 'action',
        label: tool.name,
        description: tool.description,
        icon: getIntegrationTypeIcon(integrationType),
        tool,
        integrationType,
        searchTerms: `${tool.name} ${tool.description || ''}`.toLowerCase(),
      });
    });

    return items;
  }, [blocks, triggerOptions, tools]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return unifiedItems;
    }

    const query = searchQuery.toLowerCase();
    return unifiedItems.filter((item) => item.searchTerms.includes(query));
  }, [unifiedItems, searchQuery]);

  // Group consecutive items by type for layout
  const itemGroups = useMemo(() => {
    const groups: { type: ItemType; items: UnifiedItem[] }[] = [];
    let currentGroup: { type: ItemType; items: UnifiedItem[] } | null = null;

    filteredItems.forEach((item) => {
      if (!currentGroup || currentGroup.type !== item.type) {
        currentGroup = { type: item.type, items: [item] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(item);
      }
    });

    return groups;
  }, [filteredItems]);

  const getLayoutClass = (type: ItemType): string => {
    // Blocks use 2-column grid, triggers and actions use full-width layout
    if (type === 'block') {
      return 'grid grid-cols-2 gap-1.5';
    }
    return 'space-y-1.5';
  };

  const getTypeLabel = (type: ItemType): string => {
    switch (type) {
      case 'block':
        return 'Blocks';
      case 'trigger':
        return 'Triggers';
      case 'action':
        return 'Actions';
      default:
        return '';
    }
  };

  const handleItemClick = (item: UnifiedItem) => {
    console.log('[UnifiedBuildPanel] handleItemClick:', { type: item.type, label: item.label });
    if (item.type === 'block') {
      onBlockSelect?.({
        type: item.blockType,
        label: item.label,
      });
    } else if (item.type === 'action') {
      onBlockSelect?.({
        type: 'tool',
        label: item.tool.name,
        config: {
          tool_name: item.tool.slug || item.tool.name,
          provider: item.tool.provider,
          integration_type: item.tool.integration_type,
          ...(item.tool.output_schema ? { output_schema: item.tool.output_schema } : {}),
          params: {},
        },
      });
    } else if (item.type === 'trigger') {
      // Handle triggers like blocks - add them to canvas
      console.log('[UnifiedBuildPanel] Adding trigger to canvas:', item.triggerKey);
      onBlockSelect?.({
        type: 'trigger',
        label: item.label,
        config: {
          triggerKey: item.triggerKey,
        },
      });
    }
  };

  const isLoading = isLoadingTools || isLoadingTriggers;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks, triggers, and actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Scrollable items list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          )}

          {!isLoading && filteredItems.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'No items found' : 'No items available'}
            </div>
          )}

          {!isLoading &&
            itemGroups.map((group, idx) => (
                <div key={`${group.type}-${idx}`}>
                <h3 className="text-xs text-left font-semibold text-muted-foreground mb-2 px-0.5">
                  {getTypeLabel(group.type)}
                </h3>
                <div className={getLayoutClass(group.type)}>
                  {group.items.map((item) => (
                    <UnifiedBuildItem key={item.id} item={item} onItemClick={handleItemClick} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

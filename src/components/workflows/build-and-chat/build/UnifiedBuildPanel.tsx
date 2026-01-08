import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { BUILT_IN_BLOCKS } from '../constants';
import type { BuiltInBlock, Tool } from '../types';
import type { TriggerListOption } from './TriggerSection';
import { UnifiedBuildItem } from './UnifiedBuildItem';
import { useUnifiedItems } from '@/hooks/useUnifiedItems';
import { useItemSearch } from '@/hooks/useItemSearch';
import { useItemSelection } from '@/hooks/useItemSelection';
import { groupConsecutiveItemsByType } from '@/lib/item-grouping';
import { getLayoutClass, getTypeLabel } from './utils';

interface UnifiedBuildPanelProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onBlockSelect?: (block: { type: string; label: string; config?: Record<string, unknown> }) => void;
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
  const unifiedItems = useUnifiedItems(blocks, triggerOptions, tools);
  const filteredItems = useItemSearch(unifiedItems, searchQuery);
  const itemGroups = useMemo(() => groupConsecutiveItemsByType(filteredItems), [filteredItems]);
  const handleItemClick = useItemSelection(onBlockSelect);
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

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResourceNavigation } from './ResourceNavigation';
import { ResourceSearch } from './ResourceSearch';
import { ResourceList } from './ResourceList';
import type { ResourceItem } from './types';

interface ResourcePickerContentProps {
  isSupabaseBindingPicker: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenBindingDialog: () => void;
  currentPath: Array<{ id: string; name: string }>;
  onBack: () => void;
  onNavigateToPath: (index: number) => void;
  supportsHierarchy: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  supportsSearch: boolean;
  items: ResourceItem[];
  selectedValue: string;
  onSelect: (item: ResourceItem) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  shouldDisableFetcher: boolean;
  refetch: () => void;
}

export function ResourcePickerContent({
  isSupabaseBindingPicker,
  onRefresh,
  isRefreshing,
  onOpenBindingDialog,
  currentPath,
  onBack,
  onNavigateToPath,
  supportsHierarchy,
  searchQuery,
  onSearchChange,
  supportsSearch,
  items,
  selectedValue,
  onSelect,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  error,
  shouldDisableFetcher,
  refetch,
}: ResourcePickerContentProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh resources"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {isSupabaseBindingPicker && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenBindingDialog}
              className='mr-6'
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      <ResourceNavigation
        currentPath={currentPath}
        onBack={onBack}
        onNavigateToPath={onNavigateToPath}
        supportsHierarchy={supportsHierarchy}
      />

      <ResourceSearch
        value={searchQuery}
        onChange={onSearchChange}
        supportsSearch={supportsSearch}
      />

      <ResourceList
        items={items}
        selectedValue={selectedValue}
        onSelect={onSelect}
        supportsHierarchy={supportsHierarchy}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        isError={isError}
        error={error}
        shouldDisableFetcher={shouldDisableFetcher}
        debouncedQuery={searchQuery}
        refetch={refetch}
      />
    </>
  );
}

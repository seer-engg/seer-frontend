/**
 * Resource Picker Component
 * 
 * A reusable component for browsing and selecting integration resources
 * like Google Sheets, Drive files, GitHub repos, etc.
 * 
 * Features:
 * - Search functionality
 * - Folder hierarchy navigation (for Drive)
 * - Pagination with infinite scroll
 * - Selected value display
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Folder, 
  File, 
  ChevronRight, 
  ChevronLeft,
  FileSpreadsheet,
  Check,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendApiClient } from '@/lib/api-client';

interface ResourcePickerConfig {
  resource_type: string;
  display_field?: string;
  value_field?: string;
  search_enabled?: boolean;
  hierarchy?: boolean;
  filter?: Record<string, any>;
  depends_on?: string;
}

interface ResourceItem {
  id: string;
  name: string;
  display_name: string;
  type: 'file' | 'folder' | 'sheet_tab' | 'repository' | 'branch' | 'label';
  mime_type?: string;
  icon_url?: string;
  web_url?: string;
  modified_time?: string;
  has_children?: boolean;
  description?: string;
}

interface ResourceBrowseResponse {
  items: ResourceItem[];
  next_page_token?: string;
  supports_hierarchy?: boolean;
  supports_search?: boolean;
  error?: string;
}

interface ResourcePickerProps {
  /** Resource picker configuration from tool schema */
  config: ResourcePickerConfig;
  /** OAuth provider (google, github) */
  provider: string;
  /** Current selected value (resource ID) */
  value?: string;
  /** Callback when resource is selected */
  onChange: (value: string, displayName?: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Dependent parameter values */
  dependsOnValues?: Record<string, string>;
  /** Custom trigger button class */
  className?: string;
}

export function ResourcePicker({
  config,
  provider,
  value,
  onChange,
  placeholder = 'Select a resource...',
  disabled = false,
  dependsOnValues,
  className,
}: ResourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedItem, setSelectedItem] = useState<ResourceItem | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Current parent folder ID for navigation
  const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined;

  // Build depends_on query param
  const dependsOnParam = dependsOnValues ? JSON.stringify(dependsOnValues) : undefined;

  // Check for missing dependencies
  const hasMissingDependency = config.depends_on && (!dependsOnValues || !dependsOnValues[config.depends_on]);

  // Fetch resources with infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['resources', provider, config.resource_type, debouncedQuery, currentParentId, dependsOnParam],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (currentParentId) params.set('parent_id', currentParentId);
      if (pageParam) params.set('page_token', pageParam);
      if (dependsOnParam) params.set('depends_on', dependsOnParam);
      params.set('page_size', '50');

      const response = await backendApiClient.request<ResourceBrowseResponse>(
        `/api/integrations/resources/${provider}/${config.resource_type}?${params.toString()}`,
        { method: 'GET' }
      );
      return response;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_page_token,
    enabled: open && !hasMissingDependency,
  });

  // Flatten pages to items
  const items = data?.pages.flatMap(page => page.items) ?? [];
  const supportsHierarchy = data?.pages[0]?.supports_hierarchy ?? config.hierarchy ?? false;
  const supportsSearch = data?.pages[0]?.supports_search ?? config.search_enabled ?? true;

  // Handle folder navigation
  const handleNavigate = useCallback((item: ResourceItem) => {
    if (item.type === 'folder' && item.has_children) {
      setCurrentPath(prev => [...prev, { id: item.id, name: item.name }]);
      setSearchQuery('');
    }
  }, []);

  // Handle going back in navigation
  const handleBack = useCallback(() => {
    setCurrentPath(prev => prev.slice(0, -1));
    setSearchQuery('');
  }, []);

  // Handle item selection
  const handleSelect = useCallback((item: ResourceItem) => {
    if (item.type === 'folder' && supportsHierarchy) {
      handleNavigate(item);
    } else {
      setSelectedItem(item);
      onChange(item.id, item.display_name);
      setOpen(false);
    }
  }, [supportsHierarchy, handleNavigate, onChange]);

  // Get icon for item type
  const getItemIcon = (item: ResourceItem) => {
    if (item.icon_url) {
      return <img src={item.icon_url} alt="" className="w-4 h-4" />;
    }
    
    switch (item.type) {
      case 'folder':
        return <Folder className="w-4 h-4 text-blue-500" />;
      case 'sheet_tab':
        return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      default:
        if (item.mime_type?.includes('spreadsheet')) {
          return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
        }
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Display name for current value
  const displayValue = selectedItem?.display_name || value || '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          disabled={disabled || hasMissingDependency}
        >
          <span className="truncate">
            {hasMissingDependency
              ? `Select ${config.depends_on} first`
              : displayValue || placeholder}
          </span>
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Browse Resources
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        {supportsHierarchy && currentPath.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground px-1 py-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-muted-foreground">/</span>
            {currentPath.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <span 
                  className="cursor-pointer hover:text-foreground truncate max-w-[100px]"
                  onClick={() => setCurrentPath(prev => prev.slice(0, index + 1))}
                  title={crumb.name}
                >
                  {crumb.name}
                </span>
                {index < currentPath.length - 1 && (
                  <span className="text-muted-foreground">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Search input */}
        {supportsSearch && (
          <div className="relative px-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Resource list */}
        <ScrollArea className="flex-1 mt-2 min-h-[300px] max-h-[400px]">
          {isLoading && items.length === 0 ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-destructive">
              <p>Error loading resources</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {debouncedQuery
                ? 'No results found'
                : 'No resources available'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                    value === item.id && "bg-accent"
                  )}
                  onClick={() => handleSelect(item)}
                >
                  {getItemIcon(item)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.display_name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.type === 'folder' && item.has_children && supportsHierarchy && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {value === item.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}

              {/* Load more button */}
              {hasNextPage && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


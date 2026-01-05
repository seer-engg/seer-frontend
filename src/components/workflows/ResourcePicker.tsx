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
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendApiClient, bindSupabaseProject } from '@/lib/api-client';
import { useIntegrationTools } from '@/hooks/useIntegrationTools';
import { useToast } from '@/hooks/use-toast';

type JsonRecord = Record<string, unknown>;

interface ResourcePickerConfig {
  resource_type: string;
  display_field?: string;
  value_field?: string;
  search_enabled?: boolean;
  hierarchy?: boolean;
  filter?: Record<string, unknown>;
  depends_on?: string;
  endpoint?: string;
}

interface ResourceItem {
  id: string;
  name: string;
  display_name: string;
  type?: string;
  mime_type?: string;
  icon_url?: string;
  web_url?: string;
  modified_time?: string;
  has_children?: boolean;
  description?: string;
  raw?: JsonRecord;
  project_ref?: string;
  project_id?: string | number;
  resource_key?: string;
  region?: string;
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
  /** OAuth provider (google, github). Optional if config.endpoint is provided */
  provider?: string;
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
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindingSearch, setBindingSearch] = useState('');
  const [bindingDebouncedSearch, setBindingDebouncedSearch] = useState('');
  const [bindingProjectId, setBindingProjectId] = useState<string | null>(null);
  const { toast } = useToast();
  const {
    connectIntegration,
    getConnectionId,
    isIntegrationConnected,
    toolsWithStatus,
  } = useIntegrationTools();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBindingDebouncedSearch(bindingSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [bindingSearch]);

  useEffect(() => {
    if (!bindModalOpen) {
      setBindingSearch('');
      setBindingDebouncedSearch('');
      setBindingProjectId(null);
    }
  }, [bindModalOpen]);

  // Current parent folder ID for navigation
  const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined;

  // Build depends_on query param
  const dependsOnParam = dependsOnValues ? JSON.stringify(dependsOnValues) : undefined;

  // Check for missing dependencies
  const hasMissingDependency = config.depends_on && (!dependsOnValues || !dependsOnValues[config.depends_on]);

  const normalizedEndpoint = useMemo(() => {
    if (!config.endpoint) return null;
    if (config.endpoint.startsWith('http')) return config.endpoint;
    if (config.endpoint.startsWith('/api')) return config.endpoint;
    const sanitized = config.endpoint.startsWith('/') ? config.endpoint : `/${config.endpoint}`;
    return `/api${sanitized}`;
  }, [config.endpoint]);

  const isSupabaseBindingPicker = useMemo(() => {
    if (!normalizedEndpoint) return false;
    return normalizedEndpoint.includes('/api/integrations/supabase/resources/bindings');
  }, [normalizedEndpoint]);

  const baseEndpoint = useMemo(() => {
    if (normalizedEndpoint) return normalizedEndpoint;
    if (!provider) return null;
    return `/api/integrations/resources/${provider}/${config.resource_type}`;
  }, [normalizedEndpoint, provider, config.resource_type]);

  const valueField = config.value_field || 'id';
  const displayField = config.display_field || 'display_name';

  const resolveField = useCallback((obj: JsonRecord | undefined, path?: string) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce<unknown>((acc, segment) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }
      if (typeof acc !== 'object') {
        return undefined;
      }
      const current = acc as JsonRecord;
      return current[segment as keyof JsonRecord];
    }, obj);
  }, []);

  const normalizeCustomItems = useCallback(
    (rawItems: JsonRecord[]): ResourceItem[] => {
      return rawItems
        .map((raw) => {
          const value = resolveField(raw, valueField) ?? raw?.id ?? raw?.value;
          if (value === null || value === undefined) {
            return null;
          }
          const display =
            resolveField(raw, displayField) ??
            raw?.display_name ??
            raw?.name ??
            raw?.title ??
            raw?.resource_key ??
            value;
          const description =
            raw?.description ??
            raw?.metadata?.project_ref ??
            raw?.resource_key ??
            resolveField(raw, 'description');

          return {
            id: String(value),
            name: String(display),
            display_name: String(display),
            type: raw?.type || 'resource',
            description: description ? String(description) : undefined,
            raw,
          } as ResourceItem;
        })
        .filter((item): item is ResourceItem => Boolean(item));
    },
    [displayField, resolveField, valueField]
  );

  const shouldDisableFetcher = !baseEndpoint;

  const supabaseToolNames = useMemo(() => {
    return toolsWithStatus
      .filter(tool => tool.integrationType === 'supabase')
      .map(tool => tool.tool.name);
  }, [toolsWithStatus]);

  const supabaseConnected = isIntegrationConnected('supabase');

  // Fetch resources with infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch: refetchResources,
  } = useInfiniteQuery({
    queryKey: ['resources', provider, config.resource_type, config.endpoint, debouncedQuery, currentParentId, dependsOnParam],
    queryFn: async ({ pageParam = undefined }) => {
      if (!baseEndpoint) {
        return { items: [], supports_hierarchy: false, supports_search: false };
      }

      const params = new URLSearchParams();
      if (debouncedQuery && config.search_enabled !== false) params.set('q', debouncedQuery);
      if (!normalizedEndpoint && currentParentId) params.set('parent_id', currentParentId);
      if (pageParam) params.set('page_token', pageParam);
      if (dependsOnParam) params.set('depends_on', dependsOnParam);
      if (!normalizedEndpoint) {
        params.set('page_size', '50');
      }

      const queryString = params.toString();
      const endpointWithParams = queryString
        ? `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}${queryString}`
        : baseEndpoint;

        const response = await backendApiClient.request<ResourceBrowseResponse | JsonRecord | JsonRecord[]>(
        endpointWithParams,
        { method: 'GET' }
      );

      if (normalizedEndpoint) {
        const itemsArray = Array.isArray(response)
          ? response
          : Array.isArray((response as JsonRecord)?.items)
            ? (response as JsonRecord).items as JsonRecord[]
            : [];
        return {
          items: normalizeCustomItems(itemsArray),
          next_page_token: (response as JsonRecord)?.next_page_token as string | undefined,
          supports_hierarchy: false,
          supports_search: config.search_enabled ?? true,
        };
      }

      return response as ResourceBrowseResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_page_token,
    enabled: open && !hasMissingDependency && !shouldDisableFetcher,
  });

  const {
    data: supabaseProjectsData,
    fetchNextPage: fetchNextSupabaseProjects,
    hasNextPage: supabaseProjectsHasNextPage,
    isFetchingNextPage: supabaseProjectsFetchingNextPage,
    isLoading: supabaseProjectsLoading,
    isError: supabaseProjectsIsError,
    error: supabaseProjectsError,
  } = useInfiniteQuery({
    queryKey: ['supabase-projects', bindingDebouncedSearch],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (bindingDebouncedSearch) params.set('q', bindingDebouncedSearch);
      if (pageParam) params.set('page_token', pageParam);
      params.set('page_size', '50');
      const endpoint = `/api/integrations/resources/supabase_mgmt/supabase_project?${params.toString()}`;
      return backendApiClient.request<ResourceBrowseResponse>(endpoint, { method: 'GET' });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_page_token,
    enabled: bindModalOpen && isSupabaseBindingPicker && supabaseConnected,
  });

  // Flatten pages to items
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const supportsHierarchy = data?.pages[0]?.supports_hierarchy ?? config.hierarchy ?? false;
  const supportsSearch = data?.pages[0]?.supports_search ?? config.search_enabled ?? true;
  const supabaseProjectItems = useMemo(
    () => supabaseProjectsData?.pages.flatMap(page => page.items) ?? [],
    [supabaseProjectsData],
  );
  const isBindingProject = bindingProjectId !== null;

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

  const handleConnectSupabase = useCallback(async () => {
    try {
      const toolNames = supabaseToolNames.length ? supabaseToolNames : ['supabase_table_query'];
      const redirectUrl = await connectIntegration('supabase', { toolNames });
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      toast({
        title: 'Unable to start Supabase OAuth',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [connectIntegration, supabaseToolNames, toast]);

  const handleBindProject = useCallback(
    async (item: ResourceItem) => {
      if (!item) return;
      const projectRef = item.project_ref || item.id;
      setBindingProjectId(item.id);
      try {
        const response = await bindSupabaseProject({
          projectRef,
          connectionId: getConnectionId('supabase') || undefined,
        });
        const { resource } = response;
        const display =
          resource.name ||
          resource.resource_key ||
          item.display_name ||
          item.name ||
          resource.id;
        const description = resource.metadata?.project_ref || resource.resource_key || item.project_ref;
        const newItem: ResourceItem = {
          id: String(resource.id),
          name: String(display),
          display_name: String(display),
          type: 'binding',
          description: description ? String(description) : undefined,
          resource_key: resource.resource_key || undefined,
        };
        setSelectedItem(newItem);
        onChange(newItem.id, newItem.display_name);
        await refetchResources();
        toast({
          title: 'Project bound',
          description: `${display} is ready for Supabase tools.`,
        });
        setBindModalOpen(false);
      } catch (error) {
        toast({
          title: 'Failed to bind project',
          description: error instanceof Error ? error.message : 'Unable to bind Supabase project.',
          variant: 'destructive',
        });
      } finally {
        setBindingProjectId(null);
      }
    },
    [getConnectionId, onChange, refetchResources, toast]
  );

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

  useEffect(() => {
    if (!value) {
      return;
    }
    const match = items.find(item => item.id === String(value));
    if (match) {
      setSelectedItem(match);
    }
  }, [items, value]);

  return (
    <>
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
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Browse Resources</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => refetchResources()}
                  disabled={isLoading}
                  aria-label="Refresh resources"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                {isSupabaseBindingPicker && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setBindModalOpen(true)}
                  >
                    Bind project
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

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

          <ScrollArea className="flex-1 mt-2 min-h-[300px] max-h-[400px]">
            {shouldDisableFetcher ? (
              <div className="p-4 text-center text-destructive text-sm">
                Resource picker misconfigured. Missing provider or endpoint.
              </div>
            ) : isLoading && items.length === 0 ? (
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
                  onClick={() => refetchResources()}
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

      {isSupabaseBindingPicker && (
        <Dialog open={bindModalOpen} onOpenChange={setBindModalOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Bind Supabase Project</DialogTitle>
              <DialogDescription>
                Select a Supabase project to store its REST credentials for workflows.
              </DialogDescription>
            </DialogHeader>
            {!supabaseConnected ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Supabase management account to browse projects.
                </p>
                <Button onClick={handleConnectSupabase}>
                  Connect Supabase
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={bindingSearch}
                    onChange={(e) => setBindingSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="mt-3 max-h-[320px] pr-2">
                  {supabaseProjectsLoading && supabaseProjectItems.length === 0 ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : supabaseProjectsIsError ? (
                    <div className="p-4 text-center text-destructive text-sm">
                      {supabaseProjectsError instanceof Error
                        ? supabaseProjectsError.message
                        : 'Unable to load Supabase projects'}
                    </div>
                  ) : supabaseProjectItems.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {bindingDebouncedSearch ? 'No matching projects.' : 'No projects available.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supabaseProjectItems.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-md"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{project.display_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {project.project_ref || project.id}
                              {project.region ? ` • ${project.region}` : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleBindProject(project)}
                            disabled={isBindingProject && bindingProjectId !== project.id}
                          >
                            {bindingProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Bind'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {supabaseProjectsHasNextPage && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => fetchNextSupabaseProjects()}
                    disabled={supabaseProjectsFetchingNextPage}
                  >
                    {supabaseProjectsFetchingNextPage ? 'Loading...' : 'Load more'}
                  </Button>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


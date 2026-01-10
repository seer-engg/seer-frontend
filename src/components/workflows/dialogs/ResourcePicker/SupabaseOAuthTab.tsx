import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceItem } from './types';

export interface SupabaseOAuthTabProps {
  supabaseConnected: boolean;
  bindingSearch: string;
  setBindingSearch: (value: string) => void;
  supabaseProjectItems: ResourceItem[];
  supabaseProjectsLoading: boolean;
  supabaseProjectsIsError: boolean;
  supabaseProjectsError: Error | null;
  bindingDebouncedSearch: string;
  bindingProjectId: string | null;
  handleConnectSupabase: () => void;
  handleProjectBind: (project: ResourceItem) => void;
  supabaseProjectsHasNextPage: boolean;
  supabaseProjectsFetchingNextPage: boolean;
  fetchNextSupabaseProjects: () => void;
}

export function SupabaseOAuthTab({
  supabaseConnected,
  bindingSearch,
  setBindingSearch,
  supabaseProjectItems,
  supabaseProjectsLoading,
  supabaseProjectsIsError,
  supabaseProjectsError,
  bindingDebouncedSearch,
  bindingProjectId,
  handleConnectSupabase,
  handleProjectBind,
  supabaseProjectsHasNextPage,
  supabaseProjectsFetchingNextPage,
  fetchNextSupabaseProjects,
}: SupabaseOAuthTabProps) {
  if (!supabaseConnected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your Supabase management account to browse projects.
        </p>
        <Button onClick={handleConnectSupabase}>
          Connect Supabase
        </Button>
      </div>
    );
  }

  return (
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
                  onClick={() => handleProjectBind(project)}
                  disabled={bindingProjectId !== null && bindingProjectId !== project.id}
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
  );
}

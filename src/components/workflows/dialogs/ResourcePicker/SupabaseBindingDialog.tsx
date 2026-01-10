import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { IntegrationResource } from '@/lib/api-client';
import type { useSupabaseBinding } from './hooks/useSupabaseBinding';
import type { ResourceItem } from './types';
import { SupabaseOAuthTab } from './SupabaseOAuthTab';
import { SupabaseManualTab } from './SupabaseManualTab';

export interface SupabaseBindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindingState: ReturnType<typeof useSupabaseBinding>;
  onBindSuccess: (resource: IntegrationResource, fallback?: { displayName?: string; projectRef?: string }) => void;
  refetchResources: () => void;
}

export function SupabaseBindingDialog({
  open,
  onOpenChange,
  bindingState,
  onBindSuccess,
  refetchResources,
}: SupabaseBindingDialogProps) {
  const {
    bindingSearch,
    setBindingSearch,
    bindingTab,
    setBindingTab,
    manualForm,
    setManualForm,
    manualError,
    manualSubmitting,
    manualFormIsValid,
    supabaseConnected,
    supabaseProjectItems,
    supabaseProjectsLoading,
    supabaseProjectsIsError,
    supabaseProjectsError,
    supabaseProjectsHasNextPage,
    supabaseProjectsFetchingNextPage,
    fetchNextSupabaseProjects,
    handleConnectSupabase,
    handleBindProject,
    handleManualBind,
    bindingProjectId,
  } = bindingState;

  const bindingDebouncedSearch = bindingState.bindingDebouncedSearch;

  const handleProjectBind = (project: ResourceItem) => {
    handleBindProject(
      Number(project.id),
      project.project_ref || project.id,
      project.display_name,
      onBindSuccess,
      refetchResources
    );
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleManualBind(onBindSuccess, refetchResources);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bind Supabase Project</DialogTitle>
          <DialogDescription>
            Select a Supabase project to store its REST credentials for workflows.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={bindingTab}
          onValueChange={(value) => setBindingTab(value as 'oauth' | 'manual')}
          className="mt-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oauth">OAuth</TabsTrigger>
            <TabsTrigger value="manual">Manual secrets</TabsTrigger>
          </TabsList>
          <TabsContent value="oauth" className="mt-4">
            <SupabaseOAuthTab
              supabaseConnected={supabaseConnected}
              bindingSearch={bindingSearch}
              setBindingSearch={setBindingSearch}
              supabaseProjectItems={supabaseProjectItems}
              supabaseProjectsLoading={supabaseProjectsLoading}
              supabaseProjectsIsError={supabaseProjectsIsError}
              supabaseProjectsError={supabaseProjectsError}
              bindingDebouncedSearch={bindingDebouncedSearch}
              bindingProjectId={bindingProjectId}
              handleConnectSupabase={handleConnectSupabase}
              handleProjectBind={handleProjectBind}
              supabaseProjectsHasNextPage={supabaseProjectsHasNextPage}
              supabaseProjectsFetchingNextPage={supabaseProjectsFetchingNextPage}
              fetchNextSupabaseProjects={fetchNextSupabaseProjects}
            />
          </TabsContent>
          <TabsContent value="manual" className="mt-4">
            <SupabaseManualTab
              manualForm={manualForm}
              setManualForm={setManualForm}
              manualError={manualError}
              manualSubmitting={manualSubmitting}
              manualFormIsValid={manualFormIsValid}
              handleFormSubmit={handleFormSubmit}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

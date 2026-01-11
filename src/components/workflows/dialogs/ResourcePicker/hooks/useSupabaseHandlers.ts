import { useCallback } from 'react';
import type { IntegrationResource } from '@/lib/api-client';
import type { UseToastReturn } from '@/hooks/utility/use-toast';
import { bindOAuthProject, bindManualProject } from './supabaseBindingHelpers';
import type { SupabaseManualFormState } from '../types';
import { useWorkflowSave } from '@/hooks/useWorkflowSave';

interface HandlerConfig {
  supabaseToolNames: string[];
  getConnectionId: (provider: string) => string | null;
  connectIntegration: (provider: string, options?: { toolNames: string[] }) => Promise<string | undefined>;
  toast: UseToastReturn['toast'];
  setBindingProjectId: (id: string | null) => void;
  setBindModalOpen: (open: boolean) => void;
  manualForm: SupabaseManualFormState;
  manualFormIsValid: boolean;
  setManualError: (error: string | null) => void;
  setManualSubmitting: (submitting: boolean) => void;
  resetManualForm: () => void;
  setBindingTab: (tab: 'oauth' | 'manual') => void;
}

type BindSuccessCallback = (
  resource: IntegrationResource,
  fallback?: { displayName?: string; projectRef?: string }
) => void;

interface BindContext {
  onSuccess: BindSuccessCallback;
  refetchResources: () => void;
  toast: UseToastReturn['toast'];
}

async function executeOAuthBind(
  projectRef: string,
  displayName: string,
  connectionId: string | undefined,
  context: BindContext
) {
  const response = await bindOAuthProject({ projectRef, connectionId });
  context.onSuccess(response.resource, { displayName, projectRef });
  await context.refetchResources();
  context.toast({
    title: 'Project bound',
    description: `${response.resource.name || displayName || projectRef} is ready for Supabase tools.`,
  });
}

async function executeManualBind(
  trimmed: { projectRef: string; projectName: string; serviceRoleKey: string; anonKey: string },
  context: BindContext
) {
  const response = await bindManualProject({
    projectRef: trimmed.projectRef,
    projectName: trimmed.projectName || undefined,
    serviceRoleKey: trimmed.serviceRoleKey,
    anonKey: trimmed.anonKey || undefined,
  });

  context.onSuccess(response.resource, {
    displayName: trimmed.projectName || undefined,
    projectRef: trimmed.projectRef,
  });

  await context.refetchResources();
  context.toast({
    title: 'Project bound',
    description: `${response.resource.name || trimmed.projectRef} is ready for Supabase tools.`,
  });
}

export function useSupabaseHandlers(config: HandlerConfig) {
  const { saveWorkflow, hasWorkflow } = useWorkflowSave();

  const handleConnectSupabase = useCallback(async () => {
    try {
      if (hasWorkflow) {
        await saveWorkflow();
      }
      const toolNames = config.supabaseToolNames.length
        ? config.supabaseToolNames
        : ['supabase_table_query'];
      const redirectUrl = await config.connectIntegration('supabase', { toolNames });
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error) {
      config.toast({
        title: 'Unable to start Supabase OAuth',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [config, hasWorkflow, saveWorkflow]);

  const handleBindProject = useCallback(
    async (
      projectId: number,
      projectRef: string,
      displayName: string,
      onSuccess: BindSuccessCallback,
      refetchResources: () => void
    ) => {
      config.setBindingProjectId(String(projectId));
      try {
        await executeOAuthBind(projectRef, displayName, config.getConnectionId('supabase') || undefined, {
          onSuccess,
          refetchResources,
          toast: config.toast,
        });
        config.setBindModalOpen(false);
      } catch (error) {
        config.toast({
          title: 'Failed to bind project',
          description: error instanceof Error ? error.message : 'Unable to bind Supabase project.',
          variant: 'destructive',
        });
      } finally {
        config.setBindingProjectId(null);
      }
    },
    [config]
  );

  const handleManualBind = useCallback(
    async (onSuccess: BindSuccessCallback, refetchResources: () => void) => {
      config.setManualError(null);
      const trimmed = {
        projectRef: config.manualForm.projectRef.trim(),
        projectName: config.manualForm.projectName.trim(),
        serviceRoleKey: config.manualForm.serviceRoleKey.trim(),
        anonKey: config.manualForm.anonKey.trim(),
      };

      if (!config.manualFormIsValid) {
        config.setManualError('Project reference and service role key are required.');
        return;
      }

      config.setManualSubmitting(true);
      try {
        await executeManualBind(trimmed, { onSuccess, refetchResources, toast: config.toast });
        config.setBindModalOpen(false);
        config.resetManualForm();
        config.setBindingTab('oauth');
      } catch (error) {
        const description =
          error instanceof Error ? error.message : 'Unable to bind Supabase project.';
        config.toast({ title: 'Failed to bind project', description, variant: 'destructive' });
        config.setManualError(description);
      } finally {
        config.setManualSubmitting(false);
      }
    },
    [config]
  );

  return {
    handleConnectSupabase,
    handleBindProject,
    handleManualBind,
  };
}

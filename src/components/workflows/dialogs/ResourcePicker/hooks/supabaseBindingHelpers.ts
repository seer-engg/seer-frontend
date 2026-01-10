import type { IntegrationResource } from '@/lib/api-client';
import { bindSupabaseProject, bindSupabaseProjectManual } from '@/lib/api-client';
import type { SupabaseManualFormState } from '../types';

export const buildDefaultSupabaseManualForm = (): SupabaseManualFormState => ({
  projectRef: '',
  projectName: '',
  serviceRoleKey: '',
  anonKey: '',
});

export async function bindOAuthProject(config: {
  projectRef: string;
  connectionId?: string;
}): Promise<{ resource: IntegrationResource }> {
  return bindSupabaseProject({
    projectRef: config.projectRef,
    connectionId: config.connectionId,
  });
}

export async function bindManualProject(config: {
  projectRef: string;
  projectName?: string;
  serviceRoleKey: string;
  anonKey?: string;
}): Promise<{ resource: IntegrationResource }> {
  return bindSupabaseProjectManual({
    projectRef: config.projectRef,
    projectName: config.projectName,
    serviceRoleKey: config.serviceRoleKey,
    anonKey: config.anonKey,
  });
}

export function validateManualForm(form: SupabaseManualFormState): boolean {
  return form.projectRef.trim().length >= 3 && form.serviceRoleKey.trim().length >= 8;
}

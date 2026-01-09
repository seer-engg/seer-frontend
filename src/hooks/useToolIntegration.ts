/**
 * useToolIntegration Hook
 *
 * Phase 2: Refactored to use store directly instead of wrapper hook.
 * Provides helper logic for individual tool integration status and authentication.
 */
import { useCallback, useMemo } from 'react';
import { useToolsStore } from '@/stores/toolsStore';
import { useUser } from '@clerk/clerk-react';

export function useToolIntegration(toolName: string) {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;

  // FIXED: Individual selectors instead of useShallow
  const isLoading = useToolsStore((state) => state.toolsLoading);
  const getToolIntegrationStatus = useToolsStore((state) => state.getToolIntegrationStatus);
  const connectIntegration = useToolsStore((state) => state.connectIntegration);
  const refresh = useToolsStore((state) => state.refreshIntegrationTools);

  const status = useMemo(() => getToolIntegrationStatus(toolName), [getToolIntegrationStatus, toolName]);

  const initiateAuth = useCallback(async () => {
    if (!status?.integrationType) {
      return null;
    }
    return connectIntegration(status.integrationType, { toolNames: [status.tool.name] });
  }, [status, connectIntegration]);

  return { status, isLoading, userEmail, initiateAuth, refresh };
}

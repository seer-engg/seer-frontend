/**
 * StoreInitializer Component
 *
 * Phase 2: Handles initialization of Zustand stores on app mount.
 * This replaces the useEffect initialization logic that was in wrapper hooks.
 *
 * Phase 3 Fix: Wait for Clerk to fully load before initializing stores
 * to ensure bearer token is available for API requests.
 */
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useToolsStore } from '@/stores/toolsStore';

export function StoreInitializer() {
  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const isAuthenticated = isLoaded && !!user;

  // Initialize workflows store (only after Clerk is loaded)
  useEffect(() => {
    // CRITICAL: Wait for Clerk to load before making authenticated API calls
    if (!isLoaded) return;

    const { workflowsLoaded, isLoading, loadWorkflows } = useWorkflowStore.getState();

    if (!workflowsLoaded && !isLoading) {
      void loadWorkflows().catch(() => undefined);
    }
  }, [isLoaded]);

  // Initialize tools store with user context
  useEffect(() => {
    if (!isAuthenticated) return;

    const { setUserContext, refreshIntegrationTools } = useToolsStore.getState();
    const { toolsLoaded, toolsLoading, toolStatusLoaded, toolStatusLoading, connectionsLoaded, connectionsLoading } = useToolsStore.getState();

    // Set user context
    setUserContext({ email: userEmail, isAuthenticated });

    // Load tools and integrations if not already loaded
    const needsLoad = !toolsLoaded && !toolsLoading &&
                      !toolStatusLoaded && !toolStatusLoading &&
                      !connectionsLoaded && !connectionsLoading;

    if (needsLoad) {
      // Use refreshIntegrationTools which tries bootstrap first
      void refreshIntegrationTools().catch(() => undefined);
    }
  }, [isAuthenticated, userEmail]);

  // Initialize function blocks (only after Clerk is loaded)
  useEffect(() => {
    // CRITICAL: Wait for Clerk to load before making authenticated API calls
    if (!isLoaded) return;

    const { functionBlocksLoaded, functionBlocksLoading, loadFunctionBlocks } = useToolsStore.getState();

    if (!functionBlocksLoaded && !functionBlocksLoading) {
      void loadFunctionBlocks().catch(() => undefined);
    }
  }, [isLoaded]);

  return null; // This component doesn't render anything
}

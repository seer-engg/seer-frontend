import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/utility/use-toast';
import { useToolsStore } from '@/stores/toolsStore';
import type { SupabaseManualFormState } from '../types';
import { buildDefaultSupabaseManualForm, validateManualForm } from './supabaseBindingHelpers';
import { useSupabaseProjects } from './useSupabaseProjects';
import { useSupabaseHandlers } from './useSupabaseHandlers';

export function useSupabaseBinding() {
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindingProjectId, setBindingProjectId] = useState<string | null>(null);
  const [bindingTab, setBindingTab] = useState<'oauth' | 'manual'>('oauth');
  const [manualForm, setManualForm] = useState<SupabaseManualFormState>(() => buildDefaultSupabaseManualForm());
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const { toast } = useToast();
  const connectIntegration = useToolsStore((state) => state.connectIntegration);
  const getConnectionId = useToolsStore((state) => state.getConnectionId);
  const isIntegrationConnected = useToolsStore((state) => state.isIntegrationConnected);
  const toolsWithStatus = useToolsStore((state) => state.toolsWithStatus);

  const supabaseToolNames = useMemo(() => {
    return toolsWithStatus
      .filter(tool => tool.integrationType === 'supabase')
      .map(tool => tool.tool.name);
  }, [toolsWithStatus]);

  const supabaseConnected = isIntegrationConnected('supabase');
  const manualFormIsValid = validateManualForm(manualForm);

  const projects = useSupabaseProjects(bindModalOpen && supabaseConnected);

  const resetManualForm = useCallback(() => {
    setManualForm(buildDefaultSupabaseManualForm());
    setManualError(null);
    setManualSubmitting(false);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!bindModalOpen) {
      setBindingProjectId(null);
      resetManualForm();
      setBindingTab('oauth');
    }
  }, [bindModalOpen, resetManualForm]);

  const handlers = useSupabaseHandlers({
    supabaseToolNames,
    getConnectionId,
    connectIntegration,
    toast,
    setBindingProjectId,
    setBindModalOpen,
    manualForm,
    manualFormIsValid,
    setManualError,
    setManualSubmitting,
    resetManualForm,
    setBindingTab,
  });

  const isBindingProject = bindingProjectId !== null;

  return {
    bindModalOpen,
    setBindModalOpen,
    bindingSearch: projects.bindingSearch,
    setBindingSearch: projects.setBindingSearch,
    bindingDebouncedSearch: projects.bindingDebouncedSearch,
    bindingProjectId,
    isBindingProject,
    bindingTab,
    setBindingTab,
    manualForm,
    setManualForm,
    manualError,
    manualSubmitting,
    manualFormIsValid,
    resetManualForm,
    supabaseConnected,
    supabaseToolNames,
    supabaseProjectItems: projects.items,
    supabaseProjectsLoading: projects.isLoading,
    supabaseProjectsIsError: projects.isError,
    supabaseProjectsError: projects.error,
    supabaseProjectsHasNextPage: projects.hasNextPage,
    supabaseProjectsFetchingNextPage: projects.isFetchingNextPage,
    fetchNextSupabaseProjects: projects.fetchNextPage,
    handleConnectSupabase: handlers.handleConnectSupabase,
    handleBindProject: handlers.handleBindProject,
    handleManualBind: handlers.handleManualBind,
  };
}

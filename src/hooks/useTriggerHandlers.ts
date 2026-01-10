import { useState, useCallback, useMemo } from 'react';
import { toast } from '@/components/ui/sonner';
import {
  buildBindingsPayload,
  buildDefaultBindingState,
  makeDefaultGmailConfig,
  makeDefaultSupabaseConfig,
} from '@/components/workflows/triggers/utils';
import type { BindingState } from '@/components/workflows/triggers/utils';
import {
  GMAIL_TRIGGER_KEY,
  SUPABASE_TRIGGER_KEY,
} from '@/components/workflows/triggers/constants';
import { useTriggersStore } from '@/stores/triggersStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useToolsStore } from '@/stores/toolsStore';
import type { TriggerDescriptor } from '@/types/triggers';

// Stable empty object reference to avoid creating new objects in selectors
// This prevents the "getSnapshot should be cached" error from Zustand
const EMPTY_INPUTS: Record<string, unknown> = {};

/**
 * Simplified trigger handlers hook - Phase 3 refactoring
 * Fetches all required state directly from stores instead of receiving through props
 */
export function useTriggerHandlers({
  gmailIntegrationReady,
  gmailConnectionId,
  gmailToolNames,
  createSubscription,
}: {
  gmailIntegrationReady: boolean;
  gmailConnectionId: number | null;
  gmailToolNames: string[];
  createSubscription: (data: {
    workflow_id: string;
    trigger_key: string;
    bindings: Record<string, string>;
    provider_config?: Record<string, unknown>;
    provider_connection_id?: number;
    enabled: boolean;
  }) => Promise<void>;
}) {
  // Fetch state from stores
  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const workflowInputsDef = useWorkflowStore(
    (state) => state.currentWorkflow?.spec?.inputs ?? EMPTY_INPUTS,
  );
  const triggerCatalog = useTriggersStore((state) => state.triggerCatalog);
  const connectIntegration = useToolsStore((state) => state.connectIntegration);

  // Phase 1: Use triggersStore instead of local state for draft triggers
  const addDraftTrigger = useTriggersStore((state) => state.addDraftTrigger);
  const discardDraftTrigger = useTriggersStore((state) => state.discardDraftTrigger);
  const draftTriggersMap = useTriggersStore((state) => state.draftTriggers);

  // Get drafts for current workflow
  const draftTriggers = useMemo(
    () => (selectedWorkflowId ? draftTriggersMap.get(selectedWorkflowId) || [] : []),
    [selectedWorkflowId, draftTriggersMap],
  );

  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  const handleAddTriggerDraft = useCallback(
    (triggerKey: string) => {
      console.log('[Workflows] handleAddTriggerDraft called with triggerKey:', triggerKey);
      if (!selectedWorkflowId) {
        toast.error('Save the workflow before adding triggers');
        return;
      }
      const descriptor = triggerCatalog.find((trigger) => trigger.key === triggerKey);
      if (!descriptor) {
        toast.error('Trigger metadata unavailable');
        return;
      }
      // Phase 1: Use store action instead of local setState
      const initialBindings = buildDefaultBindingState(workflowInputsDef);
      const gmailConfig = triggerKey === GMAIL_TRIGGER_KEY ? makeDefaultGmailConfig() : undefined;
      const supabaseConfig = triggerKey === SUPABASE_TRIGGER_KEY ? makeDefaultSupabaseConfig() : undefined;

      // Merge configs into initialBindings
      const fullBindings = {
        ...initialBindings,
        ...(gmailConfig || {}),
        ...(supabaseConfig || {}),
      };

      addDraftTrigger(selectedWorkflowId, triggerKey, fullBindings);
    },
    [selectedWorkflowId, triggerCatalog, workflowInputsDef, addDraftTrigger],
  );

  const handleDiscardTriggerDraft = useCallback(
    (draftId: string) => {
      if (!selectedWorkflowId) return;
      // Phase 1: Use store action instead of local setState
      discardDraftTrigger(selectedWorkflowId, draftId);
    },
    [selectedWorkflowId, discardDraftTrigger],
  );

  const handleSaveTriggerDraft = useCallback(
    async (
      draftId: string,
      payload: {
        triggerKey: string;
        bindings: BindingState;
        providerConfig?: Record<string, unknown>;
      },
    ) => {
      if (!selectedWorkflowId) {
        throw new Error('Save the workflow before saving triggers');
      }
      const descriptor = triggerCatalog.find((trigger) => trigger.key === payload.triggerKey);
      if (!descriptor) {
        throw new Error('Trigger metadata unavailable');
      }
      if (payload.triggerKey === GMAIL_TRIGGER_KEY) {
        if (!gmailIntegrationReady || !gmailConnectionId) {
          throw new Error('Connect Gmail before saving this trigger');
        }
      }
      try {
        await createSubscription({
          workflow_id: selectedWorkflowId,
          trigger_key: payload.triggerKey,
          bindings: buildBindingsPayload(payload.bindings) as Record<string, string>,
          ...(payload.providerConfig ? { provider_config: payload.providerConfig } : {}),
          ...(payload.triggerKey === GMAIL_TRIGGER_KEY
            ? { provider_connection_id: gmailConnectionId ?? undefined }
            : {}),
          enabled: true,
        });
        // Phase 1: Use store action instead of local setState
        discardDraftTrigger(selectedWorkflowId, draftId);
      } catch (error) {
        console.error('Failed to save trigger draft', error);
        throw error;
      }
    },
    [selectedWorkflowId, triggerCatalog, gmailIntegrationReady, gmailConnectionId, createSubscription, discardDraftTrigger],
  );

  const handleConnectGmail = useCallback(async () => {
    setIsConnectingGmail(true);
    try {
      const redirectUrl = await connectIntegration('gmail', { toolNames: gmailToolNames });
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      toast.error('Unable to start Gmail connection');
    } catch (error) {
      console.error('Failed to connect Gmail', error);
      toast.error('Unable to start Gmail connection', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsConnectingGmail(false);
    }
  }, [connectIntegration, gmailToolNames]);

  return {
    draftTriggers,
    isConnectingGmail,
    handleAddTriggerDraft,
    handleSaveTriggerDraft,
    handleDiscardTriggerDraft,
    handleConnectGmail,
  };
}

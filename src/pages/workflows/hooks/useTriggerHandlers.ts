import { useState, useCallback } from 'react';
import type { TriggerDraftMeta, TriggerCatalogEntry } from '@/components/workflows/types';
import type { InputDef } from '@/types/workflow-spec';
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

export interface UseTriggerHandlersParams {
  selectedWorkflowId: string | null;
  triggerCatalog: TriggerCatalogEntry[];
  workflowInputsDef: Record<string, InputDef>;
  gmailIntegrationReady: boolean;
  gmailConnectionId: number | null;
  createSubscription: (data: {
    workflow_id: string;
    trigger_key: string;
    bindings: Record<string, string>;
    provider_config?: Record<string, unknown>;
    provider_connection_id?: number;
    enabled: boolean;
  }) => Promise<void>;
  connectIntegration: (provider: string, options?: { toolNames?: string[] }) => Promise<string | void>;
  gmailToolNames: string[];
}

function createTriggerDraft(
  triggerKey: string,
  triggerCatalog: TriggerCatalogEntry[],
  workflowInputsDef: Record<string, InputDef>,
): TriggerDraftMeta | null {
  const descriptor = triggerCatalog.find((trigger) => trigger.key === triggerKey);
  if (!descriptor) {
    return null;
  }
  return {
    id: `trigger-draft-${Date.now()}`,
    triggerKey,
    initialBindings: buildDefaultBindingState(workflowInputsDef),
    initialGmailConfig: triggerKey === GMAIL_TRIGGER_KEY ? makeDefaultGmailConfig() : undefined,
    initialSupabaseConfig:
      triggerKey === SUPABASE_TRIGGER_KEY ? makeDefaultSupabaseConfig() : undefined,
  };
}

export function useTriggerHandlers(params: UseTriggerHandlersParams) {
  const {
    selectedWorkflowId,
    triggerCatalog,
    workflowInputsDef,
    gmailIntegrationReady,
    gmailConnectionId,
    createSubscription,
    connectIntegration,
    gmailToolNames,
  } = params;

  const [draftTriggers, setDraftTriggers] = useState<TriggerDraftMeta[]>([]);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  const handleAddTriggerDraft = useCallback(
    (triggerKey: string) => {
      console.log('[Workflows] handleAddTriggerDraft called with triggerKey:', triggerKey);
      const draft = createTriggerDraft(triggerKey, triggerCatalog, workflowInputsDef);
      if (!draft) {
        toast.error('Trigger metadata unavailable');
        return;
      }
      setDraftTriggers((prev) => [...prev, draft]);
    },
    [triggerCatalog, workflowInputsDef],
  );

  const handleDiscardTriggerDraft = useCallback((draftId: string) => {
    setDraftTriggers((prev) => prev.filter((draft) => draft.id !== draftId));
  }, []);

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
          bindings: buildBindingsPayload(payload.bindings),
          ...(payload.providerConfig ? { provider_config: payload.providerConfig } : {}),
          ...(payload.triggerKey === GMAIL_TRIGGER_KEY
            ? { provider_connection_id: gmailConnectionId ?? undefined }
            : {}),
          enabled: true,
        });
        setDraftTriggers((prev) => prev.filter((draft) => draft.id !== draftId));
      } catch (error) {
        console.error('Failed to save trigger draft', error);
        throw error;
      }
    },
    [selectedWorkflowId, triggerCatalog, gmailIntegrationReady, gmailConnectionId, createSubscription],
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

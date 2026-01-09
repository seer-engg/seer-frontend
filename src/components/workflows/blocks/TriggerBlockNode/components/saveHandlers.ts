import { toast } from '@/components/ui/sonner';
import type { WorkflowNodeData } from '../../../types';

type SaveDraftPayload = {
  mode: 'draft';
  draftId: string;
  body: { triggerKey: string; bindings: any; providerConfig?: Record<string, any> };
};

type SaveSubscriptionPayload = {
  mode: 'subscription';
  subscriptionId: number;
  body: { bindings: Record<string, any>; provider_config?: Record<string, any> };
};

export type SavePayload = SaveDraftPayload | SaveSubscriptionPayload;

interface SaveTriggerParams {
  payload: SavePayload;
  handlers: NonNullable<WorkflowNodeData['triggerMeta']['handlers']>;
  setIsSaving: (saving: boolean) => void;
}

const saveDraft = async ({ payload, handlers }: SaveTriggerParams) => {
  if (!handlers.saveDraft || payload.mode !== 'draft') {
    return;
  }
  try {
    await handlers.saveDraft(payload.draftId, payload.body);
    toast.success('Trigger saved');
  } catch (error) {
    console.error('Failed to save trigger draft', error);
    toast.error('Unable to save trigger', {
      description: error instanceof Error ? error.message : undefined,
    });
    throw error;
  }
};

const updateSubscription = async ({ payload, handlers }: SaveTriggerParams) => {
  if (!handlers.update || payload.mode !== 'subscription') {
    return;
  }
  try {
    await handlers.update(payload.subscriptionId, payload.body);
    toast.success('Trigger updated');
  } catch (error) {
    console.error('Failed to save trigger', error);
    toast.error('Unable to save trigger', {
      description: error instanceof Error ? error.message : undefined,
    });
    throw error;
  }
};

export const saveTrigger = async (params: SaveTriggerParams) => {
  params.setIsSaving(true);
  try {
    if (params.payload.mode === 'draft') await saveDraft(params);
    else await updateSubscription(params);
  } finally {
    params.setIsSaving(false);
  }
};

import { toast } from '@/components/ui/sonner';
import type { WorkflowNodeData } from '../../types';
import type {
  BindingState,
  GmailConfigState,
  CronConfigState,
  SupabaseConfigState,
} from '../../triggers/utils';
import {
  buildBindingsPayload,
  serializeGmailConfig,
  serializeCronConfig,
  serializeSupabaseConfig,
  validateSupabaseConfig,
} from '../../triggers/utils';

interface SaveTriggerParams {
  triggerKey: string;
  bindingState: BindingState;
  subscription: WorkflowNodeData['triggerMeta']['subscription'];
  draft: WorkflowNodeData['triggerMeta']['draft'];
  handlers: NonNullable<WorkflowNodeData['triggerMeta']['handlers']>;
  isDraft: boolean;
  isGmailTrigger: boolean;
  isCronTrigger: boolean;
  isSupabaseTrigger: boolean;
  gmailConfig: GmailConfigState;
  cronConfig: CronConfigState;
  supabaseConfig: SupabaseConfigState;
  setIsSaving: (saving: boolean) => void;
}

const resolveProviderConfig = (params: {
  isGmailTrigger: boolean;
  isCronTrigger: boolean;
  isSupabaseTrigger: boolean;
  gmailConfig: GmailConfigState;
  cronConfig: CronConfigState;
  supabaseConfig: SupabaseConfigState;
}) => {
  if (params.isGmailTrigger) {
    return serializeGmailConfig(params.gmailConfig);
  }
  if (params.isCronTrigger) {
    return serializeCronConfig(params.cronConfig);
  }
  if (params.isSupabaseTrigger) {
    return serializeSupabaseConfig(params.supabaseConfig);
  }
  return undefined;
};

const saveDraft = async (params: SaveTriggerParams) => {
  if (!params.handlers.saveDraft || !params.draft) {
    return;
  }
  const providerConfig = resolveProviderConfig(params);
  try {
    await params.handlers.saveDraft(params.draft.id, {
      triggerKey: params.triggerKey,
      bindings: params.bindingState,
      providerConfig,
    });
    toast.success('Trigger saved');
  } catch (error) {
    console.error('Failed to save trigger draft', error);
    toast.error('Unable to save trigger', {
      description: error instanceof Error ? error.message : undefined,
    });
    throw error;
  }
};

const updateSubscription = async (params: SaveTriggerParams) => {
  if (!params.handlers.update || !params.subscription) {
    return;
  }
  const providerConfig = resolveProviderConfig(params);
  const payload: Parameters<NonNullable<typeof params.handlers.update>>[1] = {
    bindings: buildBindingsPayload(params.bindingState),
  };
  if (providerConfig) {
    payload.provider_config = providerConfig;
  }
  try {
    await params.handlers.update(params.subscription.subscription_id, payload);
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
  // Validate Supabase configuration if applicable
  if (params.isSupabaseTrigger) {
    const supabaseValidation = validateSupabaseConfig(params.supabaseConfig);
    if (!supabaseValidation.valid) {
      const description =
        supabaseValidation.errors.resource ||
        supabaseValidation.errors.table ||
        supabaseValidation.errors.events ||
        'Complete the Supabase configuration before saving.';
      toast.error('Supabase configuration incomplete', { description });
      return;
    }
  }

  params.setIsSaving(true);
  try {
    if (params.isDraft) {
      await saveDraft(params);
    } else {
      await updateSubscription(params);
    }
  } finally {
    params.setIsSaving(false);
  }
};

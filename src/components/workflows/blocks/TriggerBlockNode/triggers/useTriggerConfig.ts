import { toast } from '@/components/ui/sonner';
import type { WorkflowNodeData } from '../../../types';
import { useGmailConfig } from './useGmailConfig';
import { useCronConfig } from './useCronConfig';
import { useSupabaseConfig } from './useSupabaseConfig';
import { QUICK_OPTIONS_BY_KIND, type TriggerKind } from '../components/constants';
import type { BindingState } from '../../../triggers/utils';
import {
  serializeCronConfig,
  serializeGmailConfig,
  serializeSupabaseConfig,
  buildBindingsPayload,
  validateSupabaseConfig,
} from '../../../triggers/utils';
import type { JsonObject, JsonValue } from '@/types/workflow-spec';

export type TriggerConfigState =
  | { kind: 'gmail'; config: ReturnType<typeof useGmailConfig>['gmailConfig']; setConfig: ReturnType<typeof useGmailConfig>['setGmailConfig'] }
  | { kind: 'cron'; config: ReturnType<typeof useCronConfig>['cronConfig']; setConfig: ReturnType<typeof useCronConfig>['setCronConfig'] }
  | {
      kind: 'supabase';
      config: ReturnType<typeof useSupabaseConfig>['supabaseConfig'];
      setConfig: ReturnType<typeof useSupabaseConfig>['setSupabaseConfig'];
      handleSupabaseResourceChange: ReturnType<typeof useSupabaseConfig>['handleSupabaseResourceChange'];
      handleSupabaseEventChange: ReturnType<typeof useSupabaseConfig>['handleSupabaseEventChange'];
    }
  | { kind: 'webhook'; config: null; setConfig?: never };

const keyToKind = (triggerKey: string): TriggerKind => {
  if (triggerKey.includes('gmail')) return 'gmail';
  if (triggerKey.includes('cron')) return 'cron';
  if (triggerKey.includes('supabase')) return 'supabase';
  return 'webhook';
};

export const useTriggerConfig = (
  triggerKey: string,
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>,
) => {
  // Always call individual hooks to keep hook order stable
  const gmail = useGmailConfig(triggerMeta);
  const cron = useCronConfig(triggerMeta);
  const supabase = useSupabaseConfig(triggerMeta);

  const kind = keyToKind(triggerKey);

  let state: TriggerConfigState;
  switch (kind) {
    case 'gmail':
      state = { kind, config: gmail.gmailConfig, setConfig: gmail.setGmailConfig };
      break;
    case 'cron':
      state = { kind, config: cron.cronConfig, setConfig: cron.setCronConfig };
      break;
    case 'supabase':
      state = {
        kind,
        config: supabase.supabaseConfig,
        setConfig: supabase.setSupabaseConfig,
        handleSupabaseResourceChange: supabase.handleSupabaseResourceChange,
        handleSupabaseEventChange: supabase.handleSupabaseEventChange,
      };
      break;
    default:
      state = { kind: 'webhook', config: null };
  }

  const quickOptions = kind === 'webhook' ? [] : QUICK_OPTIONS_BY_KIND[kind];

  const isLoading = !triggerMeta.handlers;

  const buildSavePayload = (args: {
    bindingState: BindingState;
    subscription: NonNullable<WorkflowNodeData['triggerMeta']>['subscription'];
    draft: NonNullable<WorkflowNodeData['triggerMeta']>['draft'];
  }):
    | {
        mode: 'draft';
        draftId: string;
        body: {
          triggerKey: string;
          bindings: BindingState;
          providerConfig?: Record<string, JsonValue>;
        };
      }
    | {
        mode: 'subscription';
        subscriptionId: number;
        body: {
          bindings: Record<string, JsonValue>;
          provider_config?: JsonObject;
        };
      }
    | null => {
    // Build provider config by kind
    let providerConfig: Record<string, JsonValue> | undefined;
    if (state.kind === 'gmail') {
      providerConfig = serializeGmailConfig(state.config);
    } else if (state.kind === 'cron') {
      providerConfig = serializeCronConfig(state.config);
    } else if (state.kind === 'supabase') {
      const validation = validateSupabaseConfig(state.config);
      if (!validation.valid) {
        const description =
          validation.errors.resource || validation.errors.table || validation.errors.events ||
          'Complete the Supabase configuration before saving.';
        toast.error('Supabase configuration incomplete', { description });
        return null;
      }
      providerConfig = serializeSupabaseConfig(state.config);
    }

    if (!args.subscription && args.draft) {
      return {
        mode: 'draft',
        draftId: args.draft.id,
        body: {
          triggerKey,
          bindings: args.bindingState,
          providerConfig,
        },
      };
    }

    if (args.subscription) {
      const payload: {
        mode: 'subscription';
        subscriptionId: number;
        body: { bindings: Record<string, any>; provider_config?: Record<string, any> };
      } = {
        mode: 'subscription',
        subscriptionId: args.subscription.subscription_id,
        body: {
          bindings: buildBindingsPayload(args.bindingState),
        },
      };
      if (providerConfig) {
        payload.body.provider_config = providerConfig;
      }
      return payload;
    }

    return null;
  };

  return {
    kind,
    state,
    quickOptions,
    isLoading,
    buildSavePayload,
  } as const;
};

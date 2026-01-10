/**
 * Hook for managing trigger configuration.
 * Uses dynamic schema-based configuration instead of hardcoded trigger-specific hooks.
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import type { JsonObject, JsonValue } from '@/types/workflow-spec';
import type { TriggerDescriptor } from '@/types/triggers';
import type { WorkflowNodeData } from '../../../types';
import type { BindingState } from '../../../triggers/utils';
import { buildBindingsPayload } from '../../../triggers/utils';
import { useDynamicTriggerConfig } from './useDynamicTriggerConfig';
import {
  deriveQuickOptionsFromSchema,
  deriveQuickOptionsFromUserSchema,
  hasFlexibleDataSchema,
  createDefaultUserSchema,
  type QuickOption,
} from '../../../triggers/schema-utils';

// Trigger kinds for special handling
export type TriggerKind = 'gmail' | 'cron' | 'supabase' | 'webhook' | 'form';

// Constants for trigger key detection
const WEBHOOK_TRIGGER_KEY = 'webhook.generic';
const FORM_TRIGGER_KEY = 'form.hosted';

/**
 * Determines the trigger kind from its key.
 */
function keyToKind(triggerKey: string): TriggerKind {
  if (triggerKey === WEBHOOK_TRIGGER_KEY) return 'webhook';
  if (triggerKey === FORM_TRIGGER_KEY) return 'form';
  if (triggerKey.includes('gmail')) return 'gmail';
  if (triggerKey.includes('cron')) return 'cron';
  if (triggerKey.includes('supabase')) return 'supabase';
  return 'webhook';
}

/**
 * Checks if a trigger supports user-defined schemas.
 */
function supportsUserSchema(triggerKey: string, descriptor?: TriggerDescriptor | null): boolean {
  const kind = keyToKind(triggerKey);
  if (kind === 'webhook' || kind === 'form') {
    return true;
  }
  // Also check if event_schema has flexible data
  if (descriptor?.event_schema) {
    return hasFlexibleDataSchema(descriptor.event_schema);
  }
  return false;
}

export type TriggerConfigState =
  | {
      kind: 'dynamic';
      configValues: Record<string, unknown>;
      setConfigValue: (key: string, value: unknown) => void;
      serializeConfig: () => Record<string, JsonValue>;
    }
  | {
      kind: 'webhook';
      config: null;
      userSchema: JsonObject;
      setUserSchema: (schema: JsonObject) => void;
    };

export const useTriggerConfig = (
  triggerKey: string,
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>,
) => {
  const { subscription, draft, descriptor } = triggerMeta;

  // Use dynamic config for all triggers with config_schema
  const dynamicConfig = useDynamicTriggerConfig(
    descriptor?.config_schema,
    subscription,
    draft,
  );

  // User schema state for webhook/form triggers
  const [userSchema, setUserSchemaState] = useState<JsonObject>(() => {
    // Try to get from draft or subscription, or create default
    if (draft?.initialProviderConfig?.user_schema) {
      return draft.initialProviderConfig.user_schema as JsonObject;
    }
    if (subscription?.provider_config?.user_schema) {
      return subscription.provider_config.user_schema as JsonObject;
    }
    return createDefaultUserSchema();
  });

  // Sync user schema when subscription/draft changes
  useEffect(() => {
    if (draft?.initialProviderConfig?.user_schema) {
      setUserSchemaState(draft.initialProviderConfig.user_schema as JsonObject);
    } else if (subscription?.provider_config?.user_schema) {
      setUserSchemaState(subscription.provider_config.user_schema as JsonObject);
    }
  }, [subscription, draft]);

  const setUserSchema = useCallback((schema: JsonObject) => {
    setUserSchemaState(schema);
  }, []);

  const kind = keyToKind(triggerKey);
  const isUserSchemaSupported = supportsUserSchema(triggerKey, descriptor);

  // Build the config state based on trigger type
  let state: TriggerConfigState;

  if (isUserSchemaSupported && !descriptor?.config_schema) {
    // Webhook/form triggers without config_schema use user schema
    state = {
      kind: 'webhook',
      config: null,
      userSchema,
      setUserSchema,
    };
  } else {
    // All other triggers use dynamic config from schema
    state = {
      kind: 'dynamic',
      configValues: dynamicConfig.configValues,
      setConfigValue: dynamicConfig.setConfigValue,
      serializeConfig: dynamicConfig.serializeConfig,
    };
  }

  // Derive quick options from schema
  const quickOptions: QuickOption[] = (() => {
    if (state.kind === 'webhook' && userSchema) {
      return deriveQuickOptionsFromUserSchema(userSchema);
    }
    if (descriptor?.event_schema) {
      return deriveQuickOptionsFromSchema(descriptor.event_schema);
    }
    return [];
  })();

  const isLoading = !triggerMeta.handlers;

  /**
   * Builds the payload for saving the trigger.
   */
  const buildSavePayload = useCallback(
    (args: {
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
      // Build provider config based on state type
      let providerConfig: Record<string, JsonValue> | undefined;

      if (state.kind === 'dynamic') {
        providerConfig = state.serializeConfig();

        // Validate required fields from schema
        if (descriptor?.config_schema) {
          const requiredFields = Array.isArray(descriptor.config_schema.required)
            ? (descriptor.config_schema.required as string[])
            : [];

          for (const field of requiredFields) {
            const value = providerConfig[field];
            if (value === undefined || value === null || value === '') {
              const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              toast.error('Configuration incomplete', {
                description: `${fieldLabel} is required.`,
              });
              return null;
            }
          }
        }
      } else if (state.kind === 'webhook') {
        // For webhook/form, store the user schema in provider_config
        providerConfig = {
          user_schema: userSchema as JsonValue,
        };
      }

      // Build payload for draft
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

      // Build payload for existing subscription
      if (args.subscription) {
        const payload: {
          mode: 'subscription';
          subscriptionId: number;
          body: { bindings: Record<string, JsonValue>; provider_config?: JsonObject };
        } = {
          mode: 'subscription',
          subscriptionId: args.subscription.subscription_id,
          body: {
            bindings: buildBindingsPayload(args.bindingState),
          },
        };

        if (providerConfig) {
          payload.body.provider_config = providerConfig as JsonObject;
        }

        return payload;
      }

      return null;
    },
    [triggerKey, state, descriptor?.config_schema, userSchema],
  );

  return {
    kind,
    state,
    quickOptions,
    isLoading,
    buildSavePayload,
    // Expose for special handling (e.g., details sections)
    isUserSchemaSupported,
    descriptor,
  } as const;
};

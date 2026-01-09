import { useEffect, useState } from 'react';
import type { WorkflowNodeData } from '../../../types';
import {
  SupabaseConfigState,
  buildSupabaseConfigFromProviderConfig,
  makeDefaultSupabaseConfig,
  type SupabaseEventType,
} from '../../../triggers/utils';

export const useSupabaseConfig = (triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>) => {
  const { subscription, draft } = triggerMeta;
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfigState>(() =>
    subscription
      ? buildSupabaseConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialSupabaseConfig ?? makeDefaultSupabaseConfig(),
  );

  useEffect(() => {
    if (subscription) {
      setSupabaseConfig(buildSupabaseConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialSupabaseConfig) {
      setSupabaseConfig(draft.initialSupabaseConfig);
    } else {
      setSupabaseConfig(makeDefaultSupabaseConfig());
    }
  }, [subscription, draft?.initialSupabaseConfig]);

  const handleSupabaseResourceChange = (value: string, label?: string) => {
    setSupabaseConfig((prev) => ({
      ...prev,
      integrationResourceId: value,
      integrationResourceLabel: label ?? value,
    }));
  };

  const handleSupabaseEventChange = (eventType: SupabaseEventType, nextChecked: boolean) => {
    setSupabaseConfig((prev) => {
      const exists = prev.events.includes(eventType);
      const nextEvents = nextChecked && !exists
        ? [...prev.events, eventType]
        : !nextChecked && exists
          ? prev.events.filter((event) => event !== eventType)
          : prev.events;
      return { ...prev, events: nextEvents };
    });
  };

  return { supabaseConfig, setSupabaseConfig, handleSupabaseResourceChange, handleSupabaseEventChange } as const;
};

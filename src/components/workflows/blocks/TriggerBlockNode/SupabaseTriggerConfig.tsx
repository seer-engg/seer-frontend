import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { WorkflowNodeData } from '../../types';
import {
  SupabaseConfigState,
  makeDefaultSupabaseConfig,
  buildSupabaseConfigFromProviderConfig,
  validateSupabaseConfig,
  type SupabaseEventType,
  SUPABASE_EVENT_TYPES,
} from '../../triggers/utils';
import { ResourcePicker } from '../../ResourcePicker';
import type { QuickOption } from './BaseTriggerNode';

const SUPABASE_PROJECT_PICKER_CONFIG = {
  resource_type: 'supabase_binding',
  endpoint: '/api/integrations/supabase/resources/bindings',
  display_field: 'display_name',
  value_field: 'id',
  search_enabled: true,
} as const;

const SUPABASE_EVENT_LABELS: Record<SupabaseEventType, string> = {
  INSERT: 'INSERT – Row created',
  UPDATE: 'UPDATE – Row modified',
  DELETE: 'DELETE – Row removed',
};

export interface SupabaseTriggerConfigProps {
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>;
}

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

  return { supabaseConfig, setSupabaseConfig, handleSupabaseResourceChange, handleSupabaseEventChange };
};

const getProjectLabel = (config: SupabaseConfigState) => {
  return config.integrationResourceLabel || (config.integrationResourceId ? `Resource #${config.integrationResourceId}` : '');
};

export interface SupabaseConfigFormProps {
  supabaseConfig: SupabaseConfigState;
  setSupabaseConfig: React.Dispatch<React.SetStateAction<SupabaseConfigState>>;
  handleSupabaseResourceChange: (value: string, label?: string) => void;
  handleSupabaseEventChange: (eventType: SupabaseEventType, nextChecked: boolean) => void;
}

export const SupabaseConfigForm: React.FC<SupabaseConfigFormProps> = ({
  supabaseConfig,
  setSupabaseConfig,
  handleSupabaseResourceChange,
  handleSupabaseEventChange,
}) => {
  const supabaseValidation = validateSupabaseConfig(supabaseConfig);
  const supabaseSelectedProjectLabel = getProjectLabel(supabaseConfig);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Supabase project</Label>
        <ResourcePicker
          config={SUPABASE_PROJECT_PICKER_CONFIG}
          value={supabaseConfig.integrationResourceId || undefined}
          onChange={(value, label) => handleSupabaseResourceChange(String(value), label)}
          placeholder="Select or bind a project"
          className="w-full"
        />
        {supabaseSelectedProjectLabel && (
          <p className="text-[11px] text-muted-foreground">Selected: {supabaseSelectedProjectLabel}</p>
        )}
        {!supabaseValidation.valid && supabaseValidation.errors.resource && (
          <p className="text-xs text-destructive">{supabaseValidation.errors.resource}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Schema</Label>
          <Input
            value={supabaseConfig.schema}
            placeholder="public"
            onChange={(event) =>
              setSupabaseConfig((prev) => ({
                ...prev,
                schema: event.target.value,
              }))
            }
          />
          <p className="text-[11px] text-muted-foreground">Defaults to the public schema.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Table</Label>
          <Input
            value={supabaseConfig.table}
            placeholder="orders"
            onChange={(event) =>
              setSupabaseConfig((prev) => ({
                ...prev,
                table: event.target.value,
              }))
            }
          />
          {!supabaseValidation.valid && supabaseValidation.errors.table && (
            <p className="text-xs text-destructive">{supabaseValidation.errors.table}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Events</Label>
        <div className="flex flex-wrap gap-4">
          {SUPABASE_EVENT_TYPES.map((eventType) => (
            <label key={eventType} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={supabaseConfig.events.includes(eventType)}
                onCheckedChange={(checked) => handleSupabaseEventChange(eventType, checked === true)}
              />
              <span className="text-xs font-medium">{SUPABASE_EVENT_LABELS[eventType]}</span>
            </label>
          ))}
        </div>
        {!supabaseValidation.valid && supabaseValidation.errors.events && (
          <p className="text-xs text-destructive">{supabaseValidation.errors.events}</p>
        )}
      </div>
    </div>
  );
};

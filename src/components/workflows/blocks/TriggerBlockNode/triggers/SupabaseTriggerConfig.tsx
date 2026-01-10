import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  SupabaseConfigState,
  validateSupabaseConfig,
  type SupabaseEventType,
  SUPABASE_EVENT_TYPES,
} from '../../../triggers/utils';
import { ResourcePicker } from '../../../dialogs/ResourcePicker';

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

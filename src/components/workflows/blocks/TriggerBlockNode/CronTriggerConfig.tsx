import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { WorkflowNodeData } from '../../types';
import {
  CronConfigState,
  makeDefaultCronConfig,
  buildCronConfigFromProviderConfig,
  validateCronExpression,
} from '../../triggers/utils';
import { CRON_PRESETS, TIMEZONE_OPTIONS } from '../../triggers/constants';

export interface CronTriggerConfigProps {
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>;
}

export const useCronConfig = (triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>) => {
  const { subscription, draft } = triggerMeta;
  const [cronConfig, setCronConfig] = useState<CronConfigState>(() =>
    subscription
      ? buildCronConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialCronConfig ?? makeDefaultCronConfig(),
  );

  useEffect(() => {
    if (subscription) {
      setCronConfig(buildCronConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialCronConfig) {
      setCronConfig(draft.initialCronConfig);
    } else {
      setCronConfig(makeDefaultCronConfig());
    }
  }, [subscription, draft?.initialCronConfig]);

  return { cronConfig, setCronConfig };
};

export const CronDetailsSection: React.FC<{ cronConfig: CronConfigState }> = ({ cronConfig }) => {
  const validation = validateCronExpression(cronConfig.cronExpression);
  return (
    <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Schedule configuration
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Expression</p>
        <code className={cn('text-xs block', !validation.valid && 'text-destructive')}>
          {cronConfig.cronExpression}
        </code>
        {!validation.valid && validation.error && (
          <p className="text-xs text-destructive">{validation.error}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Timezone</p>
        <p className="text-xs font-medium">{cronConfig.timezone}</p>
      </div>
      {cronConfig.description && (
        <div className="space-y-1.5 pt-1.5 border-t border-dashed border-border/60">
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="text-xs">{cronConfig.description}</p>
        </div>
      )}
    </div>
  );
};

export interface CronConfigFormProps {
  cronConfig: CronConfigState;
  setCronConfig: React.Dispatch<React.SetStateAction<CronConfigState>>;
}

export const CronConfigForm: React.FC<CronConfigFormProps> = ({ cronConfig, setCronConfig }) => {
  const validation = validateCronExpression(cronConfig.cronExpression);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Cron Expression</Label>
        <Input
          value={cronConfig.cronExpression}
          placeholder="*/5 * * * *"
          onChange={(e) => setCronConfig((prev) => ({ ...prev, cronExpression: e.target.value }))}
          className={!validation.valid ? 'border-destructive' : ''}
        />
        {!validation.valid && validation.error && (
          <p className="text-xs text-destructive">{validation.error}</p>
        )}
        <p className="text-xs text-muted-foreground">Five fields: minute hour day month weekday</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <Button
              key={preset.expression}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setCronConfig((prev) => ({ ...prev, cronExpression: preset.expression }))}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Timezone</Label>
          <Select
            value={cronConfig.timezone}
            onValueChange={(value) => setCronConfig((prev) => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Description</Label>
          <Input
            value={cronConfig.description}
            placeholder="Optional description"
            onChange={(e) => setCronConfig((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
};

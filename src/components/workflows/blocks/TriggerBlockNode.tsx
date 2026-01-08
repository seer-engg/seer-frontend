import { memo, useEffect, useMemo, useState } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Calendar, Copy, Database, Info, Link, Loader2, Mail, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

import type { WorkflowNodeData } from '../types';
import type { InputDef } from '@/types/workflow-spec';
import { ResourcePicker } from '../ResourcePicker';
import {
  BindingState,
  buildBindingsPayload,
  buildDefaultBindingState,
  buildGmailConfigFromProviderConfig,
  buildCronConfigFromProviderConfig,
  buildSupabaseConfigFromProviderConfig,
  deriveBindingStateFromSubscription,
  makeDefaultGmailConfig,
  makeDefaultCronConfig,
  makeDefaultSupabaseConfig,
  serializeGmailConfig,
  serializeCronConfig,
  serializeSupabaseConfig,
  validateCronExpression,
  validateSupabaseConfig,
  type GmailConfigState,
  type CronConfigState,
  type SupabaseConfigState,
  type SupabaseEventType,
  SUPABASE_EVENT_TYPES,
} from '../triggers/utils';
import {
  GMAIL_FIELD_OPTIONS,
  GMAIL_TRIGGER_KEY,
  WEBHOOK_TRIGGER_KEY,
  CRON_TRIGGER_KEY,
  CRON_FIELD_OPTIONS,
  CRON_PRESETS,
  TIMEZONE_OPTIONS,
  SUPABASE_TRIGGER_KEY,
  SUPABASE_FIELD_OPTIONS,
} from '../triggers/constants';

type WorkflowNode = FlowNode<WorkflowNodeData>;

const formatTimestamp = (value?: string) => {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

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

const INPUT_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const INPUT_TYPE_OPTIONS: Array<{ label: string; value: InputDef['type'] }> = [
  { label: 'Text', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
];

export const TriggerBlockNode = memo(function TriggerBlockNode({ data, selected }: NodeProps<WorkflowNode>) {
  const triggerMeta = data.triggerMeta;

  if (!triggerMeta) {
    return (
      <div className="rounded-lg border-2 border-destructive/40 bg-card p-4 text-sm text-muted-foreground">
        Trigger metadata unavailable
      </div>
    );
  }

  const { subscription, descriptor, workflowInputs, handlers, integration, draft } = triggerMeta;
  const isDraft = !subscription;
  const triggerKey = subscription?.trigger_key ?? draft?.triggerKey ?? '';
  
  // Handle case where handlers might not be provided yet
  if (!handlers) {
    return (
      <div className="rounded-lg border-2 border-muted bg-card p-4 text-sm text-muted-foreground">
        Loading trigger configuration...
      </div>
    );
  }
  const [bindingState, setBindingState] = useState<BindingState>(() =>
    subscription
      ? deriveBindingStateFromSubscription(workflowInputs, subscription)
      : draft?.initialBindings ?? buildDefaultBindingState(workflowInputs),
  );
  const [gmailConfig, setGmailConfig] = useState<GmailConfigState>(() =>
    subscription
      ? buildGmailConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialGmailConfig ?? makeDefaultGmailConfig(),
  );
  const [cronConfig, setCronConfig] = useState<CronConfigState>(() =>
    subscription
      ? buildCronConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialCronConfig ?? makeDefaultCronConfig(),
  );
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfigState>(() =>
    subscription
      ? buildSupabaseConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialSupabaseConfig ?? makeDefaultSupabaseConfig(),
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInputsEditor, setShowInputsEditor] = useState(false);
  const [isSavingWorkflowInput, setIsSavingWorkflowInput] = useState(false);
  const [inputDraft, setInputDraft] = useState<{
    name: string;
    type: InputDef['type'];
    description: string;
    required: boolean;
  }>({
    name: '',
    type: 'string',
    description: '',
    required: true,
  });

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);
  const hasInputs = workflowInputEntries.length > 0;
  const canManageInputs = Boolean(triggerMeta.handlers?.updateWorkflowInputs);

  const isSupabaseTrigger = triggerKey === SUPABASE_TRIGGER_KEY;
  const isWebhookTrigger = triggerKey === WEBHOOK_TRIGGER_KEY || isSupabaseTrigger;
  const isGmailTrigger = triggerKey === GMAIL_TRIGGER_KEY;
  const isCronTrigger = triggerKey === CRON_TRIGGER_KEY;
  const supabaseValidation = isSupabaseTrigger ? validateSupabaseConfig(supabaseConfig) : { valid: true, errors: {} };
  const supabaseSelectedProjectLabel =
    supabaseConfig.integrationResourceLabel ||
    (supabaseConfig.integrationResourceId ? `Resource #${supabaseConfig.integrationResourceId}` : '');

  useEffect(() => {
    if (subscription) {
      setBindingState(deriveBindingStateFromSubscription(workflowInputs, subscription));
    } else if (draft?.initialBindings) {
      setBindingState(draft.initialBindings);
    } else {
      setBindingState(buildDefaultBindingState(workflowInputs));
    }
  }, [subscription, workflowInputs, draft?.initialBindings]);

  useEffect(() => {
    if (workflowInputEntries.length === 0) {
      setShowInputsEditor(true);
    }
  }, [workflowInputEntries.length]);

  useEffect(() => {
    if (!isGmailTrigger) {
      setGmailConfig(makeDefaultGmailConfig());
      return;
    }
    if (subscription) {
      setGmailConfig(buildGmailConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialGmailConfig) {
      setGmailConfig(draft.initialGmailConfig);
    } else {
      setGmailConfig(makeDefaultGmailConfig());
    }
  }, [subscription?.provider_config, isGmailTrigger, draft?.initialGmailConfig]);

  useEffect(() => {
    if (!isCronTrigger) {
      setCronConfig(makeDefaultCronConfig());
      return;
    }
    if (subscription) {
      setCronConfig(buildCronConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialCronConfig) {
      setCronConfig(draft.initialCronConfig);
    } else {
      setCronConfig(makeDefaultCronConfig());
    }
  }, [subscription?.provider_config, isCronTrigger, draft?.initialCronConfig]);

  useEffect(() => {
    if (!isSupabaseTrigger) {
      setSupabaseConfig(makeDefaultSupabaseConfig());
      return;
    }
    if (subscription) {
      setSupabaseConfig(buildSupabaseConfigFromProviderConfig(subscription.provider_config));
    } else if (draft?.initialSupabaseConfig) {
      setSupabaseConfig(draft.initialSupabaseConfig);
    } else {
      setSupabaseConfig(makeDefaultSupabaseConfig());
    }
  }, [subscription?.provider_config, isSupabaseTrigger, draft?.initialSupabaseConfig]);

  const handleCreateWorkflowInput = async () => {
    if (!triggerMeta.handlers?.updateWorkflowInputs) {
      toast.error('Unable to edit workflow inputs');
      return;
    }
    const trimmedName = inputDraft.name.trim();
    if (!trimmedName) {
      toast.error('Input name is required');
      return;
    }
    if (!INPUT_NAME_REGEX.test(trimmedName)) {
      toast.error('Use letters, numbers, or underscores (no spaces) for input names');
      return;
    }
    if (workflowInputs && workflowInputs[trimmedName]) {
      toast.error('An input with this name already exists');
      return;
    }
    setIsSavingWorkflowInput(true);
    const nextInputs: Record<string, InputDef> = {
      ...(workflowInputs ?? {}),
      [trimmedName]: {
        type: inputDraft.type,
        required: inputDraft.required,
        description: inputDraft.description.trim() || undefined,
      },
    };
    try {
      await triggerMeta.handlers?.updateWorkflowInputs(nextInputs);
      toast.success('Workflow input added');
      setBindingState((prev) => ({
        ...prev,
        [trimmedName]: { mode: 'event', value: `data.${trimmedName}` },
      }));
      setInputDraft({ name: '', type: 'string', description: '', required: true });
    } catch (error) {
      console.error('Failed to add workflow input', error);
      toast.error('Failed to add workflow input');
    } finally {
      setIsSavingWorkflowInput(false);
    }
  };

  const handleRemoveWorkflowInput = async (inputName: string) => {
    if (!triggerMeta.handlers?.updateWorkflowInputs) {
      toast.error('Unable to edit workflow inputs');
      return;
    }
    if (!workflowInputs || !(inputName in workflowInputs)) {
      return;
    }
    setIsSavingWorkflowInput(true);
    const nextInputs = Object.fromEntries(
      Object.entries(workflowInputs).filter(([name]) => name !== inputName),
    );
    try {
      await triggerMeta.handlers?.updateWorkflowInputs(nextInputs);
      toast.success('Workflow input removed');
      setBindingState((prev) => {
        if (!(inputName in prev)) {
          return prev;
        }
        const nextState = { ...prev };
        delete nextState[inputName];
        return nextState;
      });
    } catch (error) {
      console.error('Failed to remove workflow input', error);
      toast.error('Failed to remove workflow input');
    } finally {
      setIsSavingWorkflowInput(false);
    }
  };

  const handleCopy = async (value: string | null | undefined, label: string) => {
    if (!value) {
      toast.error(`No ${label.toLowerCase()} available`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error('Clipboard error', error);
      toast.error('Unable to copy');
    }
  };

  const handleToggle = async (nextEnabled: boolean) => {
    if (!handlers?.toggle || isDraft || !subscription) {
      return;
    }
    setIsToggling(true);
    try {
      await handlers.toggle(subscription.subscription_id, nextEnabled);
      toast.success(`Trigger ${nextEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle trigger', error);
      toast.error('Unable to update trigger');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (isDraft) {
      handlers?.discardDraft?.(draft?.id ?? '');
      toast.success('Trigger draft removed');
      return;
    }
    if (!handlers?.delete || !subscription) {
      return;
    }
    if (!confirm('Delete this trigger subscription?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await handlers.delete(subscription.subscription_id);
      toast.success('Trigger removed');
    } catch (error) {
      console.error('Failed to delete trigger', error);
      toast.error('Unable to delete trigger');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (isSupabaseTrigger && !supabaseValidation.valid) {
      const description =
        supabaseValidation.errors.resource ||
        supabaseValidation.errors.table ||
        supabaseValidation.errors.events ||
        'Complete the Supabase configuration before saving.';
      toast.error('Supabase configuration incomplete', { description });
      return;
    }

    const resolveProviderConfig = () => {
      if (isGmailTrigger) {
        return serializeGmailConfig(gmailConfig);
      }
      if (isCronTrigger) {
        return serializeCronConfig(cronConfig);
      }
      if (isSupabaseTrigger) {
        return serializeSupabaseConfig(supabaseConfig);
      }
      return undefined;
    };

    const providerConfig = resolveProviderConfig();

    if (isDraft) {
      if (!handlers?.saveDraft || !draft) {
        return;
      }
      setIsSaving(true);
      try {
        await handlers.saveDraft(draft.id, {
          triggerKey,
          bindings: bindingState,
          providerConfig,
        });
        toast.success('Trigger saved');
      } catch (error) {
        console.error('Failed to save trigger draft', error);
        toast.error('Unable to save trigger', {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    if (!handlers?.update || !subscription) {
      return;
    }
    setIsSaving(true);
    try {
      const payload: Parameters<NonNullable<typeof handlers.update>>[1] = {
        bindings: buildBindingsPayload(bindingState),
      };
      if (providerConfig) {
        payload.provider_config = providerConfig;
      }
      await handlers.update(subscription.subscription_id, payload);
      toast.success('Trigger updated');
      } catch (error) {
        console.error('Failed to save trigger', error);
        toast.error('Unable to save trigger', {
          description: error instanceof Error ? error.message : undefined,
        });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBindingModeChange = (inputName: string, mode: 'event' | 'literal') => {
    setBindingState((prev) => ({
      ...prev,
      [inputName]: {
        mode,
        value:
          mode === 'event'
            ? prev[inputName]?.mode === 'event'
              ? prev[inputName]?.value ?? `data.${inputName}`
              : `data.${inputName}`
            : prev[inputName]?.mode === 'literal'
              ? prev[inputName]?.value ?? ''
              : '',
      },
    }));
  };

  const handleBindingValueChange = (inputName: string, value: string) => {
    setBindingState((prev) => ({
      ...prev,
      [inputName]: {
        mode: prev[inputName]?.mode ?? 'event',
        value,
      },
    }));
  };

  const bindingQuickInsert = (inputName: string, value: string) => {
    setBindingState((prev) => ({
      ...prev,
      [inputName]: {
        mode: 'event',
        value,
      },
    }));
  };

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
      let nextEvents: SupabaseEventType[];
      if (nextChecked && !exists) {
        nextEvents = [...prev.events, eventType];
      } else if (!nextChecked && exists) {
        nextEvents = prev.events.filter((event) => event !== eventType);
      } else {
        nextEvents = prev.events;
      }
      return {
        ...prev,
        events: nextEvents,
      };
    });
  };

  const renderWorkflowInputManager = () => {
    if (!canManageInputs) {
      return null;
    }
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Workflow inputs</p>
            <p className="text-xs text-muted-foreground">
              Add inputs for this trigger to populate before configuring bindings.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInputsEditor((prev) => !prev)}
          >
            {showInputsEditor ? 'Hide form' : 'Add input'}
          </Button>
        </div>

        {workflowInputEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No workflow inputs yet. Add one to bind incoming event data.
          </p>
        ) : (
          <div className="space-y-2">
            {workflowInputEntries.map(([inputName, inputDef]) => (
              <div
                key={inputName}
                className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{inputName}</p>
                  <p className="text-xs text-muted-foreground">
                    {inputDef.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">{inputDef.type}</Badge>
                  {inputDef.required && <Badge variant="outline">Required</Badge>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveWorkflowInput(inputName)}
                    disabled={isSavingWorkflowInput}
                    title="Remove workflow input"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showInputsEditor && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Name</Label>
              <Input
                value={inputDraft.name}
                placeholder="customerEmail"
                onChange={(event) =>
                  setInputDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                <Select
                  value={inputDraft.type}
                  onValueChange={(value) =>
                    setInputDraft((prev) => ({
                      ...prev,
                      type: value as InputDef['type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Required</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={inputDraft.required}
                    onCheckedChange={(value) =>
                      setInputDraft((prev) => ({
                        ...prev,
                        required: value,
                      }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {inputDraft.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Description</Label>
              <Input
                value={inputDraft.description}
                placeholder="Shown in manual runs"
                onChange={(event) =>
                  setInputDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateWorkflowInput}
              disabled={isSavingWorkflowInput}
            >
              {isSavingWorkflowInput ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save input'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderBindingSection = () => {
    return (
      <div className="space-y-4">
        {renderWorkflowInputManager()}
        {!hasInputs ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium">No workflow inputs defined</p>
            <p className="text-xs">
              {canManageInputs
                ? 'Add a workflow input above to bind trigger data.'
                : 'This trigger will start the workflow without input data.'}
            </p>
          </div>
        ) : (
          workflowInputEntries.map(([inputName, inputDef]) => {
          const config = bindingState[inputName] ?? { mode: 'event', value: `data.${inputName}` };
          const defaultEventPath = `data.${inputName}`;
          const quickOptions = isGmailTrigger
            ? GMAIL_FIELD_OPTIONS
            : isCronTrigger
            ? CRON_FIELD_OPTIONS
            : isSupabaseTrigger
            ? SUPABASE_FIELD_OPTIONS
            : [];
          return (
            <div key={inputName} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{inputName}</p>
                  {inputDef.description && (
                    <p className="text-xs text-muted-foreground">{inputDef.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">{inputDef.type}</Badge>
                  {inputDef.required && <Badge variant="outline">Required</Badge>}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Binding mode</Label>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant={config.mode === 'event' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleBindingModeChange(inputName, 'event')}
                    >
                      Event path
                    </Button>
                    <Button
                      type="button"
                      variant={config.mode === 'literal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleBindingModeChange(inputName, 'literal')}
                    >
                      Literal value
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">
                    {config.mode === 'event' ? 'Event path (relative to event.*)' : 'Literal value'}
                  </Label>
                  <Input
                    value={config.value}
                    placeholder={config.mode === 'event' ? defaultEventPath : '42'}
                    onChange={(event) => handleBindingValueChange(inputName, event.target.value)}
                  />
                  {config.mode === 'event' && quickOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Info className="h-3.5 w-3.5" />
                      {quickOptions.map((option) => (
                        <Button
                          key={`${inputName}-${option.path}`}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => bindingQuickInsert(inputName, option.path)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>
    );
  };

  const renderWebhookDetails = () => {
    if (!subscription) {
      return (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground bg-muted/40">
          Save this trigger to generate a webhook URL and signing secret.
        </div>
      );
    }
    const absoluteWebhookUrl =
      subscription.webhook_url && subscription.webhook_url.startsWith('http')
        ? subscription.webhook_url
        : subscription.webhook_url
          ? `${window.location.origin}${subscription.webhook_url}`
          : null;
    return (
      <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link className="h-4 w-4" />
          Webhook endpoint
        </div>
        {absoluteWebhookUrl ? (
          <>
            <code className="text-xs break-all">{absoluteWebhookUrl}</code>
            <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => handleCopy(absoluteWebhookUrl, 'Webhook URL')}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy URL
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">URL will appear once generated.</p>
        )}
        {subscription.secret_token && (
          <div className="space-y-1 pt-2 border-t border-dashed border-border/60">
            <p className="text-xs font-medium">Signing secret</p>
            <code className="text-xs break-all">{subscription.secret_token}</code>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3"
              onClick={() => handleCopy(subscription.secret_token, 'Signing secret')}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy secret
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderGmailDetails = () => {
    const gmailIntegration = integration?.gmail;
    const ready = gmailIntegration?.ready;
    return (
      <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4" />
            Gmail connection
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'text-[11px] px-2',
              ready ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            )}
          >
            {ready ? 'Connected' : 'Action required'}
          </Badge>
        </div>
        {ready && gmailIntegration?.connectionId ? (
          <p className="text-xs text-muted-foreground">
            Using connection #{gmailIntegration.connectionId}. Update OAuth scopes from Integrations.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Connect Gmail with read access so Seer can poll for emails.
          </p>
        )}
        {!ready && gmailIntegration?.onConnect && (
          <Button
            size="sm"
            onClick={() => gmailIntegration.onConnect?.()}
            disabled={gmailIntegration.isConnecting}
          >
            {gmailIntegration.isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Gmail
          </Button>
        )}
      </div>
    );
  };

  const renderGmailConfig = () => {
    if (!isGmailTrigger) {
      return null;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Label filters</Label>
          <Input
            value={gmailConfig.labelIds}
            placeholder="INBOX, UNREAD"
            onChange={(event) =>
              setGmailConfig((prev) => ({
                ...prev,
                labelIds: event.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">Comma-separated Gmail label IDs (defaults to INBOX).</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Search query</Label>
          <Input
            value={gmailConfig.query}
            placeholder="from:vip@example.com is:unread"
            onChange={(event) =>
              setGmailConfig((prev) => ({
                ...prev,
                query: event.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">Optional Gmail query appended to the poll watermark.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Max results per poll</Label>
          <Input
            type="number"
            min={1}
            max={25}
            value={gmailConfig.maxResults}
            onChange={(event) =>
              setGmailConfig((prev) => ({
                ...prev,
                maxResults: event.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">Between 1 and 25 messages per cycle.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Overlap window (ms)</Label>
          <Input
            type="number"
            min={0}
            max={900000}
            step={1000}
            value={gmailConfig.overlapMs}
            onChange={(event) =>
              setGmailConfig((prev) => ({
                ...prev,
                overlapMs: event.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">Re-read recent emails for dedupe protection.</p>
        </div>
      </div>
    );
  };

  const renderCronDetails = () => {
    const validation = validateCronExpression(cronConfig.cronExpression);
    return (
      <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          Schedule configuration
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Expression</p>
          <code className={cn("text-xs block", !validation.valid && "text-destructive")}>
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

  const renderCronConfig = () => {
    if (!isCronTrigger) {
      return null;
    }
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
          <p className="text-xs text-muted-foreground">
            Five fields: minute hour day month weekday
          </p>
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

  const renderSupabaseConfig = () => {
    if (!isSupabaseTrigger) {
      return null;
    }
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

  return (
    <div
      className={cn(
        'min-w-[260px] rounded-xl border-2 bg-card p-4 shadow-sm transition-[border,box-shadow]',
        selected ? 'border-primary shadow-lg' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isCronTrigger ? (
              <Calendar className="h-4 w-4 text-primary" />
            ) : isGmailTrigger ? (
              <Mail className="h-4 w-4 text-primary" />
            ) : isSupabaseTrigger ? (
              <Database className="h-4 w-4 text-primary" />
            ) : (
              <Link className="h-4 w-4 text-primary" />
            )}
            <p className="font-medium text-sm">
              {descriptor?.title ?? triggerKey}
            </p>
          </div>
          {descriptor?.description && (
            <p className="text-xs text-muted-foreground">{descriptor.description}</p>
          )}
          {subscription ? (
            <p className="text-[11px] text-muted-foreground">#{subscription.subscription_id}</p>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              Draft
            </Badge>
          )}
        </div>
        {subscription ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Enabled
              <Switch checked={subscription.enabled} disabled={isToggling} onCheckedChange={handleToggle} />
            </div>
            <Badge variant="outline" className="text-[10px]">
              {subscription.trigger_key}
            </Badge>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {triggerKey}
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {isWebhookTrigger && renderWebhookDetails()}
        {isGmailTrigger && renderGmailDetails()}
        {isCronTrigger && renderCronDetails()}

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span>Bindings & configuration</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {renderGmailConfig()}
            {renderCronConfig()}
            {renderSupabaseConfig()}
            {renderBindingSection()}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDraft ? 'Save trigger' : 'Save changes'}
          </Button>
          <Button
            size="sm"
            variant={isDraft ? 'outline' : 'destructive'}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {isDraft ? 'Discard' : 'Remove'}
          </Button>
        </div>

        {subscription ? (
          <p className="text-[11px] text-muted-foreground">
            Updated {formatTimestamp(subscription.updated_at)}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Configure bindings, then save to create this trigger.
          </p>
        )}
      </div>
    </div>
  );
});


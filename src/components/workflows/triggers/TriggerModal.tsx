import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, Copy, KeyRound, Link as LinkIcon, Loader2, Mail, PlusCircle, Trash2, FormInput, ExternalLink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InputBlockSection } from '@/components/workflows/block-config/sections/InputBlockSection';
import { getBackendBaseUrl } from '@/lib/api-client';
import { useWorkflowTriggers } from '@/hooks/useWorkflowTriggers';
import { useIntegrationTools } from '@/hooks/useIntegrationTools';
import { cn } from '@/lib/utils';
import type { InputDef, JsonValue } from '@/types/workflow-spec';
import type { TriggerSubscriptionResponse } from '@/types/triggers';
import {
  CRON_TRIGGER_KEY,
  CRON_FIELD_OPTIONS,
  CRON_PRESETS,
  TIMEZONE_OPTIONS,
  FORM_TRIGGER_KEY,
} from './constants';
import {
  type CronConfigState,
  makeDefaultCronConfig,
  buildCronConfigFromProviderConfig,
  serializeCronConfig,
  validateCronExpression,
} from './utils';
import { FormField } from '../block-config/widgets/FormField';

type BindingMode = 'event' | 'literal';

interface BindingConfig {
  mode: BindingMode;
  value: string;
}

interface WorkflowTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string | null;
  workflowName?: string;
  workflowInputs?: Record<string, InputDef>;
  onWorkflowInputsChange?: (inputs: Record<string, InputDef>) => Promise<void>;
}

const EVENT_PREFIX = 'event.';
const WEBHOOK_TRIGGER_KEY = 'webhook.generic';
const GMAIL_TRIGGER_KEY = 'poll.gmail.email_received';

interface GmailConfigState {
  labelIds: string;
  query: string;
  maxResults: string;
  overlapMs: string;
}

interface GmailFieldOption {
  label: string;
  path: string;
  hint?: string;
}

const GMAIL_FIELD_OPTIONS: GmailFieldOption[] = [
  { label: 'Subject', path: 'data.subject' },
  { label: 'Snippet', path: 'data.snippet' },
  { label: 'Message ID', path: 'data.message_id' },
  { label: 'Thread ID', path: 'data.thread_id' },
  { label: 'From email', path: 'data.from.email' },
  { label: 'From name', path: 'data.from.name' },
  { label: 'First recipient email', path: 'data.to.0.email' },
  { label: 'Internal date (ms)', path: 'data.internal_date_ms' },
];

const INPUT_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const INPUT_TYPE_OPTIONS: Array<{ label: string; value: InputDef['type'] }> = [
  { label: 'Text', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Integer', value: 'integer' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
];

interface TriggerOption {
  key: string;
  title: string;
  description?: string | null;
}

const makeDefaultGmailConfig = (): GmailConfigState => ({
  labelIds: 'INBOX',
  query: '',
  maxResults: '25',
  overlapMs: '300000',
});

const parseProviderConnectionId = (raw?: string | null): number | null => {
  if (!raw) {
    return null;
  }
  const segments = raw.split(':');
  const numeric = Number(segments[segments.length - 1]);
  return Number.isNaN(numeric) ? null : numeric;
};

const clampNumber = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

export function WorkflowTriggerModal({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  workflowInputs,
  onWorkflowInputsChange,
}: WorkflowTriggerModalProps) {
  const effectiveWorkflowId = open ? workflowId : null;
  const {
    triggers,
    subscriptions,
    isLoadingSubscriptions,
    isLoadingTriggers,
    createSubscription,
    toggleSubscription,
    deleteSubscription,
  } = useWorkflowTriggers(effectiveWorkflowId);

  const {
    tools,
    isLoading: isIntegrationsLoading,
    isIntegrationConnected,
    connectIntegration,
    getConnectionId,
  } = useIntegrationTools();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'create'>('subscriptions');
  const [bindingStateByTrigger, setBindingStateByTrigger] = useState<
    Record<string, Record<string, BindingConfig>>
  >({});
  const [selectedTriggerKey, setSelectedTriggerKey] = useState<string>(WEBHOOK_TRIGGER_KEY);
  const [gmailConfig, setGmailConfig] = useState<GmailConfigState>(() => makeDefaultGmailConfig());
  const [cronConfig, setCronConfig] = useState<CronConfigState>(() => makeDefaultCronConfig());
  const [formConfig, setFormConfig] = useState({
    suffix: '',
    title: '',
    description: '',
    fields: [] as any[],
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!',
  });
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [creatingTriggerKey, setCreatingTriggerKey] = useState<string | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [showInputEditor, setShowInputEditor] = useState(false);
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

  const genericTrigger = useMemo(
    () => triggers.find((trigger) => trigger.key === WEBHOOK_TRIGGER_KEY),
    [triggers],
  );
  const gmailTrigger = useMemo(
    () => triggers.find((trigger) => trigger.key === GMAIL_TRIGGER_KEY),
    [triggers],
  );
  const cronTrigger = useMemo(
    () => triggers.find((trigger) => trigger.key === CRON_TRIGGER_KEY),
    [triggers],
  );
  const triggerOptions = useMemo(() => {
    const options: TriggerOption[] = [];
    // Form trigger option
    options.push({
      key: FORM_TRIGGER_KEY,
      title: 'Hosted Form',
      description: 'Create a public form with custom URL that triggers this workflow',
    });
    if (genericTrigger) {
      options.push({
        key: WEBHOOK_TRIGGER_KEY,
        title: genericTrigger.title ?? 'Generic Webhook',
        description:
          genericTrigger.description ?? 'Accept HTTP POST requests from any service.',
      });
    }
    if (gmailTrigger) {
      options.push({
        key: GMAIL_TRIGGER_KEY,
        title: gmailTrigger.title ?? 'Gmail – New Email',
        description:
          gmailTrigger.description ?? 'Poll a Gmail inbox for newly received emails.',
      });
    }
    if (cronTrigger) {
      options.push({
        key: CRON_TRIGGER_KEY,
        title: cronTrigger.title ?? 'Cron Schedule',
        description:
          cronTrigger.description ?? 'Execute workflow on a time-based schedule.',
      });
    }
    return options;
  }, [genericTrigger, gmailTrigger, cronTrigger]);

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);
  useEffect(() => {
    if (workflowInputEntries.length === 0) {
      setShowInputEditor(true);
    }
  }, [workflowInputEntries.length]);
  const handleCreateWorkflowInput = useCallback(async () => {
    if (!workflowId) {
      toast.error('Save the workflow before adding inputs');
      return;
    }
    if (!onWorkflowInputsChange) {
      toast.error('Workflow inputs cannot be edited in this environment');
      return;
    }
    const trimmedName = inputDraft.name.trim();
    if (!trimmedName) {
      toast.error('Input name is required');
      return;
    }
    if (!INPUT_NAME_REGEX.test(trimmedName)) {
      toast.error('Use letters, numbers, or underscores for input names');
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
      await onWorkflowInputsChange(nextInputs);
      toast.success('Workflow input added');
      setInputDraft({ name: '', type: 'string', description: '', required: true });
    } catch (error) {
      console.error('Failed to add workflow input', error);
      toast.error('Failed to add workflow input');
    } finally {
      setIsSavingWorkflowInput(false);
    }
  }, [workflowId, onWorkflowInputsChange, inputDraft, workflowInputs]);

  const handleRemoveWorkflowInput = useCallback(
    async (inputName: string) => {
      if (!workflowId) {
        toast.error('Save the workflow before editing inputs');
        return;
      }
      if (!onWorkflowInputsChange || !workflowInputs || !(inputName in workflowInputs)) {
        return;
      }
      setIsSavingWorkflowInput(true);
      const nextInputs = Object.fromEntries(
        Object.entries(workflowInputs).filter(([name]) => name !== inputName),
      );
      try {
        await onWorkflowInputsChange(nextInputs);
        toast.success('Workflow input removed');
      } catch (error) {
        console.error('Failed to remove workflow input', error);
        toast.error('Failed to remove workflow input');
      } finally {
        setIsSavingWorkflowInput(false);
      }
    },
    [workflowId, onWorkflowInputsChange, workflowInputs],
  );


  useEffect(() => {
    if (!open) return;
    setActiveTab('subscriptions');
  }, [open]);

  useEffect(() => {
    if (!open || !workflowInputEntries.length || !triggerOptions.length) {
      return;
    }
    setBindingStateByTrigger((prev) => {
      const next = { ...prev };
      triggerOptions.forEach((option) => {
        const existing = next[option.key] ?? {};
        const updated: Record<string, BindingConfig> = { ...existing };
        workflowInputEntries.forEach(([inputName]) => {
          if (!updated[inputName]) {
            updated[inputName] = {
              mode: 'event',
              value: `data.${inputName}`,
            };
          }
        });
        next[option.key] = updated;
      });
      return next;
    });
  }, [open, workflowInputEntries, triggerOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!triggerOptions.length) {
      setSelectedTriggerKey(WEBHOOK_TRIGGER_KEY);
      return;
    }
    setSelectedTriggerKey((current) => {
      if (triggerOptions.some((option) => option.key === current)) {
        return current;
      }
      return triggerOptions[0].key;
    });
  }, [open, triggerOptions]);

  useEffect(() => {
    if (!open) return;
    setGmailConfig(makeDefaultGmailConfig());
  }, [open]);

  const gmailConnected = isIntegrationConnected('gmail');
  const gmailConnectionId = parseProviderConnectionId(getConnectionId('gmail'));
  const gmailIntegrationReady = gmailConnected && typeof gmailConnectionId === 'number';
  const gmailToolNames = useMemo(() => {
    const normalizedTools = Array.isArray(tools) ? tools : [];
    const names = normalizedTools
      .filter((tool) => {
        const integration = tool.integration_type?.toLowerCase();
        if (integration) {
          return integration === 'gmail';
        }
        return tool.name.toLowerCase().includes('gmail');
      })
      .map((tool) => tool.name);
    return names.length > 0 ? names : ['gmail_read_emails'];
  }, [tools]);
  const canCreateWebhook = Boolean(workflowId && genericTrigger);
  const canCreateGmail = Boolean(workflowId && gmailTrigger && gmailIntegrationReady);
  const canCreateCron = Boolean(workflowId && cronTrigger);

  const getBindingState = useCallback(
    (triggerKey: string): Record<string, BindingConfig> => bindingStateByTrigger[triggerKey] ?? {},
    [bindingStateByTrigger],
  );

  const updateBindingValue = useCallback(
    (
      triggerKey: string,
      inputName: string,
      updater: (prev: BindingConfig | undefined) => BindingConfig,
    ) => {
      setBindingStateByTrigger((prev) => {
        const triggerState = prev[triggerKey] ?? {};
        const nextBinding = updater(triggerState[inputName]);
        if (nextBinding === triggerState[inputName]) {
          return prev;
        }
        return {
          ...prev,
          [triggerKey]: {
            ...triggerState,
            [inputName]: nextBinding,
          },
        };
      });
    },
    [],
  );

  const handleCopy = async (value: string, label: string) => {
    if (!value) {
      toast.error(`No ${label.toLowerCase()} available`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Clipboard error', error);
      toast.error('Unable to copy');
    }
  };

  const sanitizeEventExpression = (path: string): string => {
    const trimmed = path.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
      return trimmed;
    }
    const normalized = trimmed.startsWith(EVENT_PREFIX) ? trimmed : `${EVENT_PREFIX}${trimmed.replace(/^\.*/, '')}`;
    return `\${${normalized}}`;
  };

  const buildBindingsPayload = (triggerKey: string): Record<string, JsonValue> => {
    const bindings: Record<string, JsonValue> = {};
    Object.entries(getBindingState(triggerKey)).forEach(([inputName, config]) => {
      if (!config?.value) {
        return;
      }
      if (config.mode === 'event') {
        const expression = sanitizeEventExpression(config.value);
        if (expression) {
          bindings[inputName] = expression;
        }
      } else {
        bindings[inputName] = coerceLiteralValue(config.value);
      }
    });
    return bindings;
  };

  const buildGmailProviderConfig = (): Record<string, JsonValue> => {
    const providerConfig: Record<string, JsonValue> = {};
    const labelIds = gmailConfig.labelIds
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (labelIds.length) {
      providerConfig.label_ids = labelIds;
    }
    const query = gmailConfig.query.trim();
    if (query) {
      providerConfig.query = query;
    }
    const maxResultsValue = clampNumber(parseInt(gmailConfig.maxResults, 10) || 25, 1, 25);
    const overlapMsValue = clampNumber(parseInt(gmailConfig.overlapMs, 10) || 300000, 0, 900000);
    providerConfig.max_results = maxResultsValue;
    providerConfig.overlap_ms = overlapMsValue;
    return providerConfig;
  };

  const handleConnectGmail = async () => {
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
  };

  const handleCreateWebhookSubscription = async () => {
    if (!workflowId || !genericTrigger) {
      toast.error('Save the workflow before adding triggers');
      return;
    }
    setCreatingTriggerKey(WEBHOOK_TRIGGER_KEY);
    try {
      const bindings = buildBindingsPayload(WEBHOOK_TRIGGER_KEY);
      await createSubscription({
        workflow_id: workflowId,
        trigger_key: genericTrigger.key,
        bindings,
        enabled: true,
      });
      toast.success('Generic webhook trigger created');
      setActiveTab('subscriptions');
    } catch (error) {
      console.error('Failed to create trigger', error);
      toast.error('Unable to create trigger', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setCreatingTriggerKey(null);
    }
  };

  const handleCreateGmailSubscription = async () => {
    if (!workflowId || !gmailTrigger) {
      toast.error('Save the workflow before adding triggers');
      return;
    }
    if (!gmailIntegrationReady || !gmailConnectionId) {
      toast.error('Connect Gmail before creating this trigger');
      return;
    }
    setCreatingTriggerKey(GMAIL_TRIGGER_KEY);
    try {
      const providerConfig = buildGmailProviderConfig();
      const bindings = buildBindingsPayload(GMAIL_TRIGGER_KEY);
      await createSubscription({
        workflow_id: workflowId,
        trigger_key: gmailTrigger.key,
        provider_connection_id: gmailConnectionId,
        provider_config: providerConfig,
        bindings,
        enabled: true,
      });
      toast.success('Gmail trigger created');
      setActiveTab('subscriptions');
    } catch (error) {
      console.error('Failed to create Gmail trigger', error);
      toast.error('Unable to create Gmail trigger', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setCreatingTriggerKey(null);
    }
  };

  const handleCreateCronSubscription = async () => {
    if (!workflowId || !cronTrigger) {
      toast.error('Save the workflow before adding triggers');
      return;
    }
    const validation = validateCronExpression(cronConfig.cronExpression);
    if (!validation.valid) {
      toast.error('Invalid cron expression', {
        description: validation.error,
      });
      return;
    }
    setCreatingTriggerKey(CRON_TRIGGER_KEY);
    try {
      const providerConfig = serializeCronConfig(cronConfig);
      const bindings = buildBindingsPayload(CRON_TRIGGER_KEY);
      await createSubscription({
        workflow_id: workflowId,
        trigger_key: cronTrigger.key,
        provider_config: providerConfig,
        bindings,
        enabled: true,
      });
      toast.success('Cron schedule trigger created');
      setActiveTab('subscriptions');
    } catch (error) {
      console.error('Failed to create cron trigger', error);
      toast.error('Unable to create cron trigger', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setCreatingTriggerKey(null);
    }
  };

  const handleCreateFormSubscription = async () => {
    if (!workflowId) {
      toast.error('Save the workflow before adding triggers');
      return;
    }
    if (!formConfig.suffix || !formConfig.title || formConfig.fields.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreatingTriggerKey(FORM_TRIGGER_KEY);
    try {
      // Build auto-bindings from form fields
      const bindings: Record<string, string> = {};
      formConfig.fields.forEach((field: any) => {
        bindings[field.name] = `\${event.data.${field.name}}`;
      });

      await createSubscription({
        workflow_id: workflowId,
        trigger_key: FORM_TRIGGER_KEY, // Form triggers use dedicated form.hosted type
        form_suffix: formConfig.suffix,
        form_fields: formConfig.fields,
        form_config: {
          title: formConfig.title,
          description: formConfig.description,
          submitButtonText: formConfig.submitButtonText,
          successMessage: formConfig.successMessage,
        },
        bindings,
        enabled: true,
      });

      const formUrl = `${window.location.origin}/${formConfig.suffix}`;
      toast.success('Form trigger created!', {
        description: `Access at: ${formUrl}`,
      });

      // Reset form config
      setFormConfig({
        suffix: '',
        title: '',
        description: '',
        fields: [],
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
      });

      setActiveTab('subscriptions');
    } catch (error) {
      console.error('Failed to create form trigger', error);
      toast.error('Unable to create form trigger', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setCreatingTriggerKey(null);
    }
  };

  const handleToggle = async (subscriptionId: number, enabled: boolean) => {
    setPendingToggleId(subscriptionId);
    try {
      await toggleSubscription({ subscriptionId, enabled });
      toast.success(`Trigger ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle trigger', error);
      toast.error('Unable to update trigger');
    } finally {
      setPendingToggleId(null);
    }
  };

  const handleDelete = async (subscriptionId: number) => {
    if (!confirm('Delete this trigger subscription?')) {
      return;
    }
    setPendingDeleteId(subscriptionId);
    try {
      await deleteSubscription(subscriptionId);
      toast.success('Trigger removed');
    } catch (error) {
      console.error('Failed to delete trigger', error);
      toast.error('Unable to delete trigger');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const renderSubscriptionCard = (subscription: TriggerSubscriptionResponse) => {
    const triggerMeta = triggers.find((trigger) => trigger.key === subscription.trigger_key);
    const title = triggerMeta?.title ?? subscription.trigger_key;
    const isWebhookTrigger = subscription.trigger_key === WEBHOOK_TRIGGER_KEY;
    const isGmailTrigger = subscription.trigger_key === GMAIL_TRIGGER_KEY;
    const isCronTrigger = subscription.trigger_key === CRON_TRIGGER_KEY;
    const absoluteWebhookUrl =
      isWebhookTrigger && subscription.webhook_url
        ? buildAbsoluteWebhookUrl(subscription.webhook_url)
        : null;
    const renderCronSummary = () => {
      const providerConfig = (subscription.provider_config ?? {}) as Record<string, unknown>;
      const cronExpression = String(providerConfig['cron_expression'] ?? 'Not set');
      const timezone = String(providerConfig['timezone'] ?? 'UTC');
      const description = providerConfig['description']
        ? String(providerConfig['description'])
        : null;
      return (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted p-3 bg-muted/30 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Calendar className="h-4 w-4" />
            Cron schedule configuration
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              <code className="font-mono">{cronExpression}</code>
            </Badge>
            <Badge variant="outline">{timezone}</Badge>
          </div>
          {description && <p className="text-xs text-muted-foreground">Description: {description}</p>}
        </div>
      );
    };
    const renderGmailSummary = () => {
      const providerConfig = (subscription.provider_config ?? {}) as Record<string, unknown>;
      const labelIdsValue = providerConfig['label_ids'];
      const labelIdsRaw = Array.isArray(labelIdsValue) ? labelIdsValue : undefined;
      const labelSummary =
        Array.isArray(labelIdsRaw) && labelIdsRaw.length > 0 ? labelIdsRaw.join(', ') : 'INBOX (default)';
      const queryValue = providerConfig['query'];
      const query =
        typeof queryValue === 'string' && queryValue.trim().length ? queryValue.trim() : null;
      const maxResultsRaw =
        typeof providerConfig['max_results'] === 'number'
          ? (providerConfig['max_results'] as number)
          : Number(providerConfig['max_results']);
      const maxResults = clampNumber(maxResultsRaw ?? 25, 1, 25);
      const overlapRaw =
        typeof providerConfig['overlap_ms'] === 'number'
          ? (providerConfig['overlap_ms'] as number)
          : Number(providerConfig['overlap_ms']);
      const overlapMs = clampNumber(overlapRaw ?? 300000, 0, 900000);
      const overlapMinutes = Math.max(0, Math.round(overlapMs / 60000));
      return (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted p-3 bg-muted/30 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Mail className="h-4 w-4" />
            Gmail polling configuration
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Labels: {labelSummary}</Badge>
            <Badge variant="outline">Max {maxResults}/poll</Badge>
            <Badge variant="outline">Overlap {overlapMinutes}m</Badge>
          </div>
          {query && <p className="text-xs text-muted-foreground">Query: {query}</p>}
          <p className="text-xs text-muted-foreground">
            Connection {subscription.provider_connection_id ? `#${subscription.provider_connection_id}` : 'not linked'}
            {!gmailConnected && (
              <span className="ml-1 text-destructive"> · Reconnect Gmail to keep polling</span>
            )}
          </p>
        </div>
      );
    };
    return (
      <div
        key={subscription.subscription_id}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">#{subscription.subscription_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`enabled-${subscription.subscription_id}`} className="text-xs text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id={`enabled-${subscription.subscription_id}`}
              checked={subscription.enabled}
              disabled={pendingToggleId === subscription.subscription_id}
              onCheckedChange={(checked) => handleToggle(subscription.subscription_id, checked)}
            />
          </div>
        </div>

        {isWebhookTrigger &&
          (absoluteWebhookUrl ? (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4" />
                Webhook URL
              </div>
              <code className="text-xs break-all">{absoluteWebhookUrl}</code>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => handleCopy(absoluteWebhookUrl, 'Webhook URL')}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Webhook URL will appear once generated.</p>
          ))}

        {isWebhookTrigger && subscription.secret_token && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted p-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4" />
              Signing Secret
            </div>
            <code className="text-xs break-all">{subscription.secret_token}</code>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => handleCopy(subscription.secret_token ?? '', 'Signing secret')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Secret
            </Button>
          </div>
        )}

        {subscription.form_suffix && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-muted p-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FormInput className="h-4 w-4" />
              Public Form URL
            </div>
            <code className="text-xs break-all">
              {window.location.origin}/{subscription.form_suffix}
            </code>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(`${window.location.origin}/${subscription.form_suffix}`, 'Form URL')
                }
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/${subscription.form_suffix}`, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>
        )}

        {isGmailTrigger && renderGmailSummary()}
        {isCronTrigger && renderCronSummary()}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated {new Date(subscription.updated_at).toLocaleString()}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(subscription.subscription_id)}
            disabled={pendingDeleteId === subscription.subscription_id}
          >
            {pendingDeleteId === subscription.subscription_id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderBindingGrid = (
    triggerKey: string,
    options?: {
      description?: ReactNode;
      fieldOptions?: GmailFieldOption[];
    },
  ) => {
    const renderWorkflowInputsPanel = () => {
      if (!workflowId || !onWorkflowInputsChange) {
        return null;
      }
      return (
        <div className="rounded-lg border border-dashed bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Workflow inputs</p>
              <p className="text-xs text-muted-foreground">
                Add fields that this trigger can populate before wiring bindings.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowInputEditor((prev) => !prev)}>
              {showInputEditor ? 'Hide form' : 'Add input'}
            </Button>
          </div>
          {workflowInputEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No workflow inputs yet. Add one to map event payloads.
            </p>
          ) : (
            <div className="space-y-2">
              {workflowInputEntries.map(([name, def]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded border bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{def.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">{def.type}</Badge>
                    {def.required && <Badge variant="outline">Required</Badge>}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveWorkflowInput(name)}
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
          {showInputEditor && (
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

    if (!workflowInputEntries.length) {
      return (
        <div className="space-y-4">
          {renderWorkflowInputsPanel()}
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
            <p>This workflow does not define any inputs.</p>
            <p>Use the trigger configuration panel to add workflow inputs before binding data.</p>
          </div>
        </div>
      );
    }

    const bindingState = getBindingState(triggerKey);
    const fieldOptions = options?.fieldOptions ?? [];

    return (
      <div className="space-y-4">
        {renderWorkflowInputsPanel()}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Input bindings</h4>
          {options?.description ?? (
            <p className="text-sm text-muted-foreground">
              Choose how incoming event payloads populate your workflow inputs.
            </p>
          )}
        </div>
        <div className="space-y-4">
          {workflowInputEntries.map(([inputName, inputDef]) => {
            const binding = bindingState[inputName];
            const defaultEventPath = `data.${inputName}`;
            const bindingMode = binding?.mode ?? 'event';
            const bindingValue =
              binding?.value ?? (bindingMode === 'event' ? defaultEventPath : '');
            return (
              <div key={inputName} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{inputName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inputDef.description || 'Workflow input'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">{inputDef.type}</Badge>
                    {inputDef.required && <Badge variant="outline">Required</Badge>}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">Binding mode</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={bindingMode === 'event' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateBindingValue(triggerKey, inputName, (prev) => ({
                            mode: 'event',
                            value:
                              prev?.mode === 'event' && prev?.value ? prev.value : defaultEventPath,
                          }))
                        }
                      >
                        Event path
                      </Button>
                      <Button
                        type="button"
                        variant={bindingMode === 'literal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateBindingValue(triggerKey, inputName, (prev) => ({
                            mode: 'literal',
                            value: prev?.mode === 'literal' ? prev.value ?? '' : '',
                          }))
                        }
                      >
                        Literal
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      {bindingMode === 'event' ? 'Event path (relative to event.*)' : 'Literal value'}
                    </Label>
                    <Input
                      value={bindingValue}
                      placeholder={bindingMode === 'event' ? 'data.owner_id' : '42'}
                      onChange={(event) =>
                        updateBindingValue(triggerKey, inputName, (prev) => ({
                          mode: prev?.mode ?? 'event',
                          value: event.target.value,
                        }))
                      }
                    />
                    {bindingMode === 'event' && fieldOptions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Quick insert:</span>
                        {fieldOptions.map((field) => (
                          <Button
                            key={`${inputName}-${field.path}`}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              updateBindingValue(triggerKey, inputName, () => ({
                                mode: 'event',
                                value: field.path,
                              }))
                            }
                          >
                            {field.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWebhookForm = () => {
    if (!genericTrigger) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Generic webhook trigger metadata is unavailable.
        </div>
      );
    }
    const isCreatingWebhook = creatingTriggerKey === WEBHOOK_TRIGGER_KEY;
    const bindingGrid = renderBindingGrid(WEBHOOK_TRIGGER_KEY, {
      description: (
        <p className="text-sm text-muted-foreground">
          Choose how incoming webhook payloads populate your workflow inputs. Use event mode for{' '}
          <code className="font-mono text-xs">{'${event.data.foo}'}</code> references or literal
          values for static defaults.
        </p>
      ),
    });
    return (
      <div className="space-y-4">
        {bindingGrid}
        <Button
          type="button"
          onClick={handleCreateWebhookSubscription}
          disabled={!canCreateWebhook || isCreatingWebhook}
        >
          {isCreatingWebhook ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Generic Webhook Trigger
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderGmailForm = () => {
    if (!gmailTrigger) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Gmail trigger metadata is unavailable.
        </div>
      );
    }
    const isCreatingGmail = creatingTriggerKey === GMAIL_TRIGGER_KEY;
    const bindingGrid = renderBindingGrid(GMAIL_TRIGGER_KEY, {
      description: (
        <p className="text-sm text-muted-foreground">
          Map Gmail event outputs (for example{' '}
          <code className="font-mono text-xs">{'${event.data.subject}'}</code>) to the inputs your
          workflow expects. Use literal mode for static defaults.
        </p>
      ),
      fieldOptions: GMAIL_FIELD_OPTIONS,
    });
    return (
      <div className="space-y-2">
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Gmail connection</p>
              <p className="text-xs text-muted-foreground">
                {gmailIntegrationReady ? 'We will reuse your existing Gmail OAuth connection.' : 'Connect Gmail with read access so Seer can poll for messages.'}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                'text-[11px] px-2',
                gmailIntegrationReady
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
              )}
            >
              {gmailIntegrationReady ? 'Connected' : 'Action required'}
            </Badge>
          </div>
          {isIntegrationsLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking Gmail connection...
            </div>
          ) : gmailIntegrationReady ? (
            <p className="text-xs text-muted-foreground">
              Linked connection #{gmailConnectionId}. You can update this under Integrations.
            </p>
          ) : (
            <Button
              type="button"
              onClick={handleConnectGmail}
              disabled={isConnectingGmail}
              className="w-fit"
            >
              {isConnectingGmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Connect Gmail
                </>
              )}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <FormField
            label="Label filters"
            description="Comma-separated Gmail label IDs (defaults to INBOX)"
            defaultValue="INBOX"
          >
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
          </FormField>
          <FormField
            label="Search query"
            description="Optional Gmail query appended to the poll watermark"
          >
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
          </FormField>
          <FormField
            label="Max results per poll"
            description="Between 1 and 25 messages per cycle"
            defaultValue={25}
          >
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
          </FormField>
          <FormField
            label="Overlap window (ms)"
            description="Re-read recent emails for dedupe protection"
            defaultValue={300000}
          >
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
          </FormField>
        </div>
        {bindingGrid}
        <Button
          type="button"
          onClick={handleCreateGmailSubscription}
          disabled={!canCreateGmail || isCreatingGmail}
        >
          {isCreatingGmail ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Gmail Trigger
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderCronForm = () => {
    if (!cronTrigger) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Cron trigger metadata is unavailable.
        </div>
      );
    }
    const isCreatingCron = creatingTriggerKey === CRON_TRIGGER_KEY;
    const validation = validateCronExpression(cronConfig.cronExpression);
    const bindingGrid = renderBindingGrid(CRON_TRIGGER_KEY, {
      description: (
        <p className="text-sm text-muted-foreground">
          Map cron event outputs (for example{' '}
          <code className="font-mono text-xs">{'${event.data.scheduled_time}'}</code>) to the inputs
          your workflow expects. Use literal mode for static defaults.
        </p>
      ),
      fieldOptions: CRON_FIELD_OPTIONS,
    });
    return (
      <div className="space-y-5">
        <div className="space-y-4">
          <FormField
            label="Cron Expression"
            description="Five fields: minute (0-59), hour (0-23), day (1-31), month (1-12), weekday (0-6)"
          >
            <div>
              <Input
                value={cronConfig.cronExpression}
                placeholder="*/5 * * * *"
                onChange={(e) =>
                  setCronConfig((prev) => ({ ...prev, cronExpression: e.target.value }))
                }
                className={!validation.valid ? 'border-destructive' : ''}
              />
              {!validation.valid && validation.error && (
                <p className="text-xs text-destructive mt-1">{validation.error}</p>
              )}
            </div>
          </FormField>

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
                  onClick={() =>
                    setCronConfig((prev) => ({ ...prev, cronExpression: preset.expression }))
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <FormField
            label="Timezone"
            description="Schedule will execute in this timezone"
            defaultValue="UTC"
          >
            <Select
              value={cronConfig.timezone}
              onValueChange={(value) =>
                setCronConfig((prev) => ({ ...prev, timezone: value }))
              }
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
          </FormField>

          <FormField
            label="Description"
            description="Optional description for this cron schedule"
          >
            <Input
              value={cronConfig.description}
              placeholder="e.g., Daily morning report generation"
              onChange={(e) =>
                setCronConfig((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </FormField>
        </div>
        {bindingGrid}
        <Button
          type="button"
          onClick={handleCreateCronSubscription}
          disabled={!canCreateCron || !validation.valid || isCreatingCron}
        >
          {isCreatingCron ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Cron Trigger
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderFormTriggerForm = () => {
    const canCreate = workflowId && formConfig.suffix && formConfig.title && formConfig.fields.length > 0;
    const isCreating = creatingTriggerKey === FORM_TRIGGER_KEY;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-suffix">
              Form URL <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {window.location.origin}/
              </span>
              <Input
                id="form-suffix"
                value={formConfig.suffix}
                onChange={(e) =>
                  setFormConfig((prev) => ({
                    ...prev,
                    suffix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                placeholder="contact-form"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-title">
              Form Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-title"
              value={formConfig.title}
              onChange={(e) => setFormConfig((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Contact Us"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-description">Description (Optional)</Label>
            <Textarea
              id="form-description"
              value={formConfig.description}
              onChange={(e) =>
                setFormConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Fill out this form to get in touch"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Form Fields <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Define the fields that will appear in your form
            </p>
            <InputBlockSection
              config={{ fields: formConfig.fields }}
              setConfig={(newConfig) =>
                setFormConfig((prev) => ({ ...prev, fields: newConfig.fields }))
              }
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleCreateFormSubscription}
          disabled={!canCreate || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Form Trigger
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderCreateForm = () => {
    if (!workflowId) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Save the workflow to attach triggers.
        </div>
      );
    }

    if (!triggerOptions.length) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No trigger types are available yet. Check back soon.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Trigger type</h4>
          <p className="text-sm text-muted-foreground">
            Choose how {workflowName ? <span className="font-semibold">{workflowName}</span> : 'this workflow'} should start automatically.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {triggerOptions.map((option) => {
            const isActive = option.key === selectedTriggerKey;
            return (
              <button
                key={option.key}
                type="button"
                className={cn(
                  'rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
                )}
                onClick={() => setSelectedTriggerKey(option.key)}
              >
                <p className="font-medium">{option.title}</p>
                {option.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                )}
              </button>
            );
          })}
        </div>

        {selectedTriggerKey === FORM_TRIGGER_KEY && renderFormTriggerForm()}
        {selectedTriggerKey === WEBHOOK_TRIGGER_KEY && renderWebhookForm()}
        {selectedTriggerKey === GMAIL_TRIGGER_KEY && renderGmailForm()}
        {selectedTriggerKey === CRON_TRIGGER_KEY && renderCronForm()}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Workflow Triggers</DialogTitle>
          <DialogDescription>
            Attach webhook or Gmail triggers to{' '}
            <span className="font-semibold">{workflowName || 'this workflow'}</span> so runs start automatically from external events.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'subscriptions' | 'create')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="subscriptions">Existing triggers</TabsTrigger>
            <TabsTrigger value="create">Add trigger</TabsTrigger>
          </TabsList>
          <TabsContent value="subscriptions">
            <ScrollArea className="mt-4 h-[360px] pr-4">
              <div className="space-y-4">
                {isLoadingSubscriptions || isLoadingTriggers ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading triggers...
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No triggers yet. Create a webhook or Gmail trigger to run this workflow automatically.
                  </div>
                ) : (
                  subscriptions.map((subscription) => renderSubscriptionCard(subscription))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="create">
            <ScrollArea className="mt-4 h-[360px] pr-4">
              {renderCreateForm()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function coerceLiteralValue(raw: string): JsonValue {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const jsonLike = /^(true|false|null|\d+(\.\d+)?|\[|\{)/.test(trimmed);
  if (jsonLike) {
    try {
      return JSON.parse(trimmed) as JsonValue;
    } catch (error) {
      console.warn('Failed to parse literal JSON, falling back to string', error);
    }
  }
  return raw;
}

function buildAbsoluteWebhookUrl(relative: string): string {
  const base = getBackendBaseUrl();
  if (!relative) {
    return base;
  }
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }
  return `${base}${relative.startsWith('/') ? relative : `/${relative}`}`;
}


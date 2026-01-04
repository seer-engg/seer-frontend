import { memo, useEffect, useMemo, useState } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Copy, Info, Link, Loader2, Mail, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

import type { WorkflowNodeData } from '../types';
import {
  BindingState,
  buildBindingsPayload,
  buildDefaultBindingState,
  buildGmailConfigFromProviderConfig,
  deriveBindingStateFromSubscription,
  makeDefaultGmailConfig,
  serializeGmailConfig,
  type GmailConfigState,
} from '../triggers/utils';
import { GMAIL_FIELD_OPTIONS, GMAIL_TRIGGER_KEY, WEBHOOK_TRIGGER_KEY } from '../triggers/constants';

type WorkflowNode = FlowNode<WorkflowNodeData>;

const formatTimestamp = (value?: string) => {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);
  const hasInputs = workflowInputEntries.length > 0;

  const isWebhookTrigger = triggerKey === WEBHOOK_TRIGGER_KEY;
  const isGmailTrigger = triggerKey === GMAIL_TRIGGER_KEY;

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
    if (isDraft) {
      if (!handlers?.saveDraft || !draft) {
        return;
      }
      setIsSaving(true);
      try {
        await handlers.saveDraft(draft.id, {
          triggerKey,
          bindings: bindingState,
          providerConfig: isGmailTrigger ? serializeGmailConfig(gmailConfig) : undefined,
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
      if (isGmailTrigger) {
        payload.provider_config = serializeGmailConfig(gmailConfig);
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

  const renderBindingSection = () => {
    if (!hasInputs) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Add an Input block to expose workflow inputs for this trigger.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {workflowInputEntries.map(([inputName, inputDef]) => {
          const config = bindingState[inputName] ?? { mode: 'event', value: `data.${inputName}` };
          const defaultEventPath = `data.${inputName}`;
          const quickOptions = isGmailTrigger ? GMAIL_FIELD_OPTIONS : [];
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
        })}
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
            {isGmailTrigger ? <Mail className="h-4 w-4 text-primary" /> : <Link className="h-4 w-4 text-primary" />}
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


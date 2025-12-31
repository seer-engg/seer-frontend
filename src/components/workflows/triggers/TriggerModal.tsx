import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Link as LinkIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';

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
import { getBackendBaseUrl } from '@/lib/api-client';
import { useWorkflowTriggers } from '@/hooks/useWorkflowTriggers';
import type { InputDef } from '@/types/workflow-spec';
import type { TriggerSubscriptionResponse } from '@/types/triggers';

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
}

const EVENT_PREFIX = 'event.';

export function WorkflowTriggerModal({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  workflowInputs,
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

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'create'>('subscriptions');
  const [bindingState, setBindingState] = useState<Record<string, BindingConfig>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const genericTrigger = useMemo(() => triggers.find((trigger) => trigger.key === 'webhook.generic'), [triggers]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('subscriptions');
    setBindingState((prev) => {
      const next: Record<string, BindingConfig> = {};
      Object.keys(workflowInputs ?? {}).forEach((inputName) => {
        next[inputName] = prev[inputName] ?? {
          mode: 'event',
          value: `data.${inputName}`,
        };
      });
      return next;
    });
  }, [workflowInputs, open]);

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);

  const canCreate = Boolean(workflowId && genericTrigger);

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

  const buildBindingsPayload = (): Record<string, unknown> => {
    const bindings: Record<string, unknown> = {};
    Object.entries(bindingState).forEach(([inputName, config]) => {
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

  const handleCreateSubscription = async () => {
    if (!workflowId || !genericTrigger) {
      toast.error('Save the workflow before adding triggers');
      return;
    }
    setIsCreating(true);
    try {
      const bindings = buildBindingsPayload();
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
      setIsCreating(false);
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
    const absoluteWebhookUrl = subscription.webhook_url
      ? buildAbsoluteWebhookUrl(subscription.webhook_url)
      : null;
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

        {absoluteWebhookUrl ? (
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
        )}

        {subscription.secret_token && (
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

  const renderCreateForm = () => {
    if (!workflowId) {
      return (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Save the workflow to attach triggers.
        </div>
      );
    }

    if (!workflowInputEntries.length) {
      return (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
          <p>This workflow does not define any inputs.</p>
          <p>Add an Input block to expose variables that triggers can populate.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Input bindings</h4>
          <p className="text-sm text-muted-foreground">
            Choose how incoming webhook payloads populate your workflow inputs. Use event mode for{' '}
            <code className="font-mono text-xs">{'${event.data.foo}'}</code> references or literal values for static defaults.
          </p>
        </div>
        <div className="space-y-4">
          {workflowInputEntries.map(([inputName, inputDef]) => {
            const binding = bindingState[inputName];
            return (
              <div key={inputName} className="rounded-lg border p-4 space-y-3">
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
                <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">Binding mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={binding?.mode === 'event' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setBindingState((prev) => ({
                            ...prev,
                            [inputName]: { mode: 'event', value: binding?.value ?? `data.${inputName}` },
                          }))
                        }
                      >
                        Event path
                      </Button>
                      <Button
                        type="button"
                        variant={binding?.mode === 'literal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setBindingState((prev) => ({
                            ...prev,
                            [inputName]: { mode: 'literal', value: binding?.value ?? '' },
                          }))
                        }
                      >
                        Literal
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      {binding?.mode === 'event' ? 'Event path (relative to event.*)' : 'Literal value'}
                    </Label>
                    <Input
                      value={binding?.value ?? ''}
                      placeholder={binding?.mode === 'event' ? 'data.owner_id' : '42'}
                      onChange={(event) =>
                        setBindingState((prev) => ({
                          ...prev,
                          [inputName]: { mode: binding?.mode ?? 'event', value: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button
          onClick={handleCreateSubscription}
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
              Create Generic Webhook Trigger
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Workflow Triggers</DialogTitle>
          <DialogDescription>
            Attach webhook triggers to <span className="font-semibold">{workflowName || 'this workflow'}</span> so runs start automatically from external events.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'subscriptions' | 'create')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="subscriptions">Existing triggers</TabsTrigger>
            <TabsTrigger value="create">Add webhook trigger</TabsTrigger>
          </TabsList>
          <TabsContent value="subscriptions">
            <ScrollArea className="mt-4 h-[420px] pr-4">
              <div className="space-y-4">
                {isLoadingSubscriptions || isLoadingTriggers ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading triggers...
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No triggers yet. Create one to generate a webhook URL and signing secret.
                  </div>
                ) : (
                  subscriptions.map((subscription) => renderSubscriptionCard(subscription))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="create">
            <ScrollArea className="mt-4 h-[420px] pr-4">
              {renderCreateForm()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function coerceLiteralValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const jsonLike = /^(true|false|null|\d+(\.\d+)?|\[|\{)/.test(trimmed);
  if (jsonLike) {
    try {
      return JSON.parse(trimmed);
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


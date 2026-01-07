import { memo, useEffect, useMemo, useState } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Calendar, Copy, Link, Loader2, Mail } from 'lucide-react';
import { WorkflowNodeSummary } from '../WorkflowNodeSummary';

import type { WorkflowNodeData } from '../types';
import {
  buildCronConfigFromProviderConfig,
  makeDefaultCronConfig,
  type CronConfigState,
} from '../triggers/utils';
import { GMAIL_TRIGGER_KEY, WEBHOOK_TRIGGER_KEY, CRON_TRIGGER_KEY } from '../triggers/constants';

type WorkflowNode = FlowNode<WorkflowNodeData>;

const formatTimestamp = (value?: string) => {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

/* eslint-disable max-lines-per-function, complexity */
export const TriggerBlockNode = memo(function TriggerBlockNode({ data, selected }: NodeProps<WorkflowNode>) {
  const triggerMeta = data.triggerMeta;

  // Initialize hooks before any early returns (Rules of Hooks)
  const subscription = triggerMeta?.subscription;
  const draft = triggerMeta?.draft;
  const [cronConfig] = useState<CronConfigState>(() =>
    subscription
      ? buildCronConfigFromProviderConfig(subscription.provider_config)
      : draft?.initialCronConfig ?? makeDefaultCronConfig(),
  );
  const [isToggling, setIsToggling] = useState(false);

  if (!triggerMeta) {
    return (
      <div className="rounded-lg border-2 border-destructive/40 bg-card p-4 text-sm text-muted-foreground">
        Trigger metadata unavailable
      </div>
    );
  }

  const { descriptor, workflowInputs, handlers, integration } = triggerMeta;
  const isDraft = !subscription;
  const triggerKey = subscription?.trigger_key ?? draft?.triggerKey ?? '';

  const isWebhookTrigger = triggerKey === WEBHOOK_TRIGGER_KEY;
  const isGmailTrigger = triggerKey === GMAIL_TRIGGER_KEY;
  const isCronTrigger = triggerKey === CRON_TRIGGER_KEY;


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


  const renderCronDetails = () => {
    return (
      <WorkflowNodeSummary
        config={{
          cronExpression: cronConfig.cronExpression,
          timezone: cronConfig.timezone,
          description: cronConfig.description,
        }}
        priorityKeys={['cronExpression', 'timezone', 'description']}
        limit={3}
        fallbackMessage="Double-click to configure schedule"
      />
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
      </div>

      {/* Output handle for connecting to next workflow node */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        className="!w-3 !h-3 !bg-border !border-2 !border-background"
      />
    </div>
  );
});


import { Button } from '@/components/ui/button';
import { Copy, Link } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

import type { WorkflowNodeData } from '../../types';

export interface WebhookDetailsSectionProps {
  subscription: WorkflowNodeData['triggerMeta']['subscription'];
}

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

export const WebhookDetailsSection: React.FC<WebhookDetailsSectionProps> = ({ subscription }) => {
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
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3"
            onClick={() => handleCopy(absoluteWebhookUrl, 'Webhook URL')}
          >
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

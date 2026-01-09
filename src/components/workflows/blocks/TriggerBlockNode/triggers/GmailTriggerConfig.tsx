import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { WorkflowNodeData } from '../../../types';
import { GmailConfigState } from '../../../triggers/utils';


const renderGmailStatus = (ready: boolean, connectionId?: number) => {
  if (ready && connectionId) {
    return (
      <p className="text-xs text-muted-foreground">
        Using connection #{connectionId}. Update OAuth scopes from Integrations.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      Connect Gmail with read access so Seer can poll for emails.
    </p>
  );
};

export const GmailDetailsSection: React.FC<{ integration?: WorkflowNodeData['triggerMeta']['integration'] }> = ({
  integration,
}) => {
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
            ready
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          )}
        >
          {ready ? 'Connected' : 'Action required'}
        </Badge>
      </div>
      {renderGmailStatus(ready, gmailIntegration?.connectionId)}
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

export interface GmailConfigFormProps {
  gmailConfig: GmailConfigState;
  setGmailConfig: React.Dispatch<React.SetStateAction<GmailConfigState>>;
}

export const GmailConfigForm: React.FC<GmailConfigFormProps> = ({ gmailConfig, setGmailConfig }) => {
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

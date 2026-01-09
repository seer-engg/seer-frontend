import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Database, Link, Mail } from 'lucide-react';
import type { WorkflowNodeData } from '../../types';
import type { TriggerKind } from './constants';

interface TriggerHeaderProps {
  descriptor: WorkflowNodeData['triggerMeta']['descriptor'];
  subscription: WorkflowNodeData['triggerMeta']['subscription'];
  triggerKey: string;
  triggerKind: TriggerKind;
  isToggling: boolean;
  handleToggle: (nextEnabled: boolean) => void;
}

export const TriggerHeader: React.FC<TriggerHeaderProps> = ({
  descriptor,
  subscription,
  triggerKey,
  triggerKind,
  isToggling,
  handleToggle,
}) => {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {triggerKind === 'cron' ? (
            <Calendar className="h-4 w-4 text-primary" />
          ) : triggerKind === 'gmail' ? (
            <Mail className="h-4 w-4 text-primary" />
          ) : triggerKind === 'supabase' ? (
            <Database className="h-4 w-4 text-primary" />
          ) : (
            <Link className="h-4 w-4 text-primary" />
          )}
          <p className="font-medium text-sm">{descriptor?.title ?? triggerKey}</p>
        </div>
        {descriptor?.description && <p className="text-xs text-muted-foreground">{descriptor.description}</p>}
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
  );
};

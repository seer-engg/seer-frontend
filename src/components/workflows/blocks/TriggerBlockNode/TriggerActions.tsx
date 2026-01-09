import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import type { WorkflowNodeData } from '../../types';
import { formatTimestamp } from './utils';

interface TriggerActionsProps {
  subscription: WorkflowNodeData['triggerMeta']['subscription'];
  isDraft: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  handleSave: () => void;
  handleDelete: () => void;
}

export const TriggerActions: React.FC<TriggerActionsProps> = ({
  subscription,
  isDraft,
  isSaving,
  isDeleting,
  handleSave,
  handleDelete,
}) => {
  return (
    <>
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
          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {isDraft ? 'Discard' : 'Remove'}
        </Button>
      </div>

      {subscription ? (
        <p className="text-[11px] text-muted-foreground">Updated {formatTimestamp(subscription.updated_at)}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Configure bindings, then save to create this trigger.
        </p>
      )}
    </>
  );
};

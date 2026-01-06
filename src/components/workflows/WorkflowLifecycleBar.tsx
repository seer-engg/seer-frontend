import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowLifecycleStatus } from '@/components/workflows/build-and-chat/types';

interface WorkflowLifecycleBarProps {
  lifecycleStatus?: WorkflowLifecycleStatus | null;
  onRunClick: () => void;
  onPublishClick: () => void;
  isExecuting?: boolean;
  isPublishing?: boolean;
  canRun?: boolean;
  canPublish?: boolean;
  publishDisabledReason?: string;
  runDisabledReason?: string;
}

const renderVersionLabel = (
  label: string,
  version?: WorkflowLifecycleStatus['latestVersion'],
): string => {
  if (!version) {
    return `${label}: —`;
  }
  const versionNumber = version.version_number ?? version.version_id;
  const statusSuffix = version.status ? ` (${version.status.toLowerCase()})` : '';
  return `${label}: v${versionNumber}${statusSuffix}`;
};

export function WorkflowLifecycleBar({
  lifecycleStatus,
  onRunClick,
  onPublishClick,
  isExecuting,
  isPublishing,
  canRun = true,
  canPublish = false,
  publishDisabledReason,
  runDisabledReason,
}: WorkflowLifecycleBarProps) {
  return (
    <div className="bg-card/95 backdrop-blur border rounded-full shadow-xl px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
      {lifecycleStatus ? (
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <Badge variant="outline">Draft rev {lifecycleStatus.draftRevision ?? '—'}</Badge>
          <Badge variant="outline">{renderVersionLabel('Latest', lifecycleStatus.latestVersion)}</Badge>
          <Badge variant={lifecycleStatus.publishedVersion ? 'default' : 'outline'}>
            {renderVersionLabel('Published', lifecycleStatus.publishedVersion)}
          </Badge>
          <span className="uppercase tracking-wide">
            Last test version: {lifecycleStatus.lastTestedVersionId ?? '—'}
          </span>
        </div>
      ) : (
        <span>No workflow selected</span>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={onRunClick}
          disabled={!canRun || isExecuting}
          size="sm"
          variant="default"
          title={runDisabledReason}
        >
          {isExecuting ? 'Testing…' : 'Test Run'}
        </Button>
        <Button
          onClick={onPublishClick}
          disabled={!canPublish || isPublishing}
          size="sm"
          variant="secondary"
          title={publishDisabledReason}
        >
          {isPublishing ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}


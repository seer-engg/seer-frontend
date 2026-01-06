import { History, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowLifecycleStatus } from '@/components/workflows/build-and-chat/types';
import type { WorkflowVersionListItem } from '@/types/workflow-spec';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  versionOptions?: WorkflowVersionListItem[];
  onVersionRestore?: (versionId: number) => void;
  isVersionsLoading?: boolean;
  isRestoringVersion?: boolean;
  versionRestoreDisabledReason?: string;
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

const formatHistoryLabel = (version: WorkflowVersionListItem): string => {
  const versionNumber = version.version_number ?? version.version_id;
  const status = version.status?.toLowerCase?.();
  const qualifiers = [
    status,
    version.is_published ? 'published' : null,
    version.is_latest ? 'latest' : null,
  ].filter(Boolean);
  return `v${versionNumber}${qualifiers.length ? ` · ${qualifiers.join(' · ')}` : ''}`;
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
  versionOptions,
  onVersionRestore,
  isVersionsLoading,
  isRestoringVersion,
  versionRestoreDisabledReason,
}: WorkflowLifecycleBarProps) {
  const hasVersionOptions = Boolean(versionOptions && versionOptions.length > 0);
  const versionButtonDisabled = !hasVersionOptions || isVersionsLoading || isRestoringVersion;

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={versionButtonDisabled}
              title={
                versionRestoreDisabledReason ??
                (!hasVersionOptions ? 'Run tests to create checkpoint versions' : undefined)
              }
            >
              {isRestoringVersion ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Restoring…
                </>
              ) : (
                <>
                  <History className="mr-1 h-3 w-3" />
                  Versions
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              Draft revision {lifecycleStatus?.draftRevision ?? '—'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isVersionsLoading && (
              <DropdownMenuItem disabled>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading versions…
              </DropdownMenuItem>
            )}
            {!isVersionsLoading && hasVersionOptions ? (
              versionOptions!.map((version) => (
                <DropdownMenuItem
                  key={version.version_id}
                  onSelect={(event) => {
                    event.preventDefault();
                    onVersionRestore?.(version.version_id);
                  }}
                >
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium text-foreground">{formatHistoryLabel(version)}</span>
                    {version.created_from_draft_revision && (
                      <span className="text-muted-foreground">
                        Draft rev {version.created_from_draft_revision}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              !isVersionsLoading && (
                <DropdownMenuItem disabled>No versions available yet</DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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


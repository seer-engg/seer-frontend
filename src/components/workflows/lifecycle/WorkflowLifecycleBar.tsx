import { History, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowLifecycleStatus } from '@/components/workflows/buildtypes';
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
  // const statusSuffix = version.status ? ` (${version.status.toLowerCase()})` : '';
  return `${label}: v${versionNumber}`;
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

function VersionsDropdownContent({
  lifecycleStatus,
  isVersionsLoading,
  versionOptions,
  onVersionRestore,
}: {
  lifecycleStatus?: WorkflowLifecycleStatus | null;
  isVersionsLoading?: boolean;
  versionOptions?: WorkflowVersionListItem[];
  onVersionRestore?: (versionId: number) => void;
}) {
  const hasVersionOptions = Boolean(versionOptions && versionOptions.length > 0);

  return (
    <DropdownMenuContent align="end" className="w-56">
      {lifecycleStatus && (
        <>
          <DropdownMenuLabel className="flex items-center gap-2 text-[11px]">
            <Badge variant="outline" className="h-4 px-1">
              {renderVersionLabel('Latest', lifecycleStatus.latestVersion)}
            </Badge>
            <Badge variant={lifecycleStatus.publishedVersion ? 'default' : 'outline'} className="h-4 px-1">
              {renderVersionLabel('Published', lifecycleStatus.publishedVersion)}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
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
            </div>
          </DropdownMenuItem>
        ))
      ) : (
        !isVersionsLoading && <DropdownMenuItem disabled>No versions available yet</DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}

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
    <div className="bg-card/95 backdrop-blur border rounded-full shadow-xl px-2 py-1.5 flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="text-muted-foreground h-7 px-2.5 text-[11px]"
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
        <VersionsDropdownContent
          lifecycleStatus={lifecycleStatus}
          isVersionsLoading={isVersionsLoading}
          versionOptions={versionOptions}
          onVersionRestore={onVersionRestore}
        />
      </DropdownMenu>
      <Button
        onClick={onRunClick}
        disabled={!canRun || isExecuting}
        size="sm"
        variant="default"
        className="h-7 px-2.5 text-[11px]"
        title={runDisabledReason}
      >
        {isExecuting ? 'Testing…' : 'Run'}
      </Button>
      <Button
        onClick={onPublishClick}
        disabled={!canPublish || isPublishing}
        size="sm"
        variant="default"
        className="h-7 px-2.5 text-[11px]"
        title={publishDisabledReason}
      >
        {isPublishing ? 'Publishing…' : 'Publish'}
      </Button>
    </div>
  );
}


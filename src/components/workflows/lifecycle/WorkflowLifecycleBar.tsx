import { History, Loader2, Play, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { WorkflowLifecycleStatus } from '@/components/workflows/buildtypes';
import type { WorkflowVersionListItem } from '@/types/workflow-spec';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

function VersionsButton({
  lifecycleStatus,
  versionOptions,
  onVersionRestore,
  isVersionsLoading,
  isRestoringVersion,
  versionRestoreDisabledReason,
}: Pick<
  WorkflowLifecycleBarProps,
  | 'lifecycleStatus'
  | 'versionOptions'
  | 'onVersionRestore'
  | 'isVersionsLoading'
  | 'isRestoringVersion'
  | 'versionRestoreDisabledReason'
>) {
  const hasVersionOptions = Boolean(versionOptions && versionOptions.length > 0);
  const isDisabled = !hasVersionOptions || isVersionsLoading || isRestoringVersion;

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={isDisabled} aria-label="Version History">
              {isRestoringVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Version History</p>
            {isDisabled && (versionRestoreDisabledReason || !hasVersionOptions) && (
              <p className="text-xs text-muted-foreground">
                {versionRestoreDisabledReason ?? 'Run tests to create checkpoint versions'}
              </p>
            )}
          </div>
        </TooltipContent>
        <VersionsDropdownContent
          lifecycleStatus={lifecycleStatus}
          isVersionsLoading={isVersionsLoading}
          versionOptions={versionOptions}
          onVersionRestore={onVersionRestore}
        />
      </DropdownMenu>
    </Tooltip>
  );
}

function RunButton({
  onRunClick,
  isExecuting,
  canRun,
  runDisabledReason,
}: Pick<WorkflowLifecycleBarProps, 'onRunClick' | 'isExecuting' | 'canRun' | 'runDisabledReason'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onRunClick}
          disabled={!canRun || isExecuting}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Test Workflow"
        >
          {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{isExecuting ? 'Testing Workflow' : 'Test Workflow'}</p>
          {(!canRun && runDisabledReason) || !isExecuting ? (
            <p className="text-xs text-muted-foreground">{runDisabledReason ?? 'Run a test execution'}</p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function PublishButton({
  onPublishClick,
  isPublishing,
  canPublish,
  publishDisabledReason,
}: Pick<WorkflowLifecycleBarProps, 'onPublishClick' | 'isPublishing' | 'canPublish' | 'publishDisabledReason'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onPublishClick}
          disabled={!canPublish || isPublishing}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Publish Workflow"
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{isPublishing ? 'Publishing' : 'Publish Workflow'}</p>
          {(!canPublish && publishDisabledReason) || !isPublishing ? (
            <p className="text-xs text-muted-foreground">{publishDisabledReason ?? 'Create a production version'}</p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkflowLifecycleBar(props: WorkflowLifecycleBarProps) {
  return (
    <div className="bg-card/95 backdrop-blur border rounded-full shadow-xl px-1 py-1 flex items-center gap-0.5">
      <VersionsButton
        lifecycleStatus={props.lifecycleStatus}
        versionOptions={props.versionOptions}
        onVersionRestore={props.onVersionRestore}
        isVersionsLoading={props.isVersionsLoading}
        isRestoringVersion={props.isRestoringVersion}
        versionRestoreDisabledReason={props.versionRestoreDisabledReason}
      />
      <RunButton
        onRunClick={props.onRunClick}
        isExecuting={props.isExecuting}
        canRun={props.canRun}
        runDisabledReason={props.runDisabledReason}
      />
      <PublishButton
        onPublishClick={props.onPublishClick}
        isPublishing={props.isPublishing}
        canPublish={props.canPublish}
        publishDisabledReason={props.publishDisabledReason}
      />
    </div>
  );
}

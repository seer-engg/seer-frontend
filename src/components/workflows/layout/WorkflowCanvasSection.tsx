import { ReactFlowProvider, Node } from '@xyflow/react';
import { WorkflowCanvas } from '@/components/workflows/canvas/WorkflowCanvas';
import { WorkflowLifecycleBar } from '@/components/workflows/lifecycle/WorkflowLifecycleBar';
import { FloatingWorkflowsPanel } from '@/components/workflows/panels/FloatingWorkflowsPanel';
import { WorkflowImportDialog } from '@/components/workflows/dialogs/WorkflowImportDialog';
import type { Workflow, WorkflowVersion } from '@/types/workflow';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';

interface ProposalPreview {
  proposal: {
    summary: string;
  };
}

interface WorkflowCanvasSectionProps {
  selectedWorkflowId: string | null;
  previewGraph: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] } | null;
  proposalPreview: ProposalPreview | null;
  lifecycleStatus: { isStale: boolean; isPublishable: boolean };
  workflows: Workflow[];
  isLoadingWorkflows: boolean;
  workflowVersions: WorkflowVersion[];
  isLoadingWorkflowVersions: boolean;
  isExecuting: boolean;
  isPublishing: boolean;
  isRestoringVersion: boolean;
  canRun: boolean;
  canPublish: boolean;
  publishDisabledReason?: string;
  runDisabledReason?: string;
  isImportDialogOpen: boolean;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node<WorkflowNodeData>) => void;
  onNodeDrop?: (event: React.DragEvent) => void;
  onRunClick: () => void;
  onPublishClick: () => void;
  onVersionRestore: (versionId: number) => void;
  onLoadWorkflow: (workflowId: string) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onRenameWorkflow: (workflowId: string, newName: string) => void;
  onNewWorkflow: () => void;
  onExportWorkflow: (workflowId: string) => void;
  onImportDialogOpen: () => void;
  onImportWorkflow: (workflowData: unknown) => void;
  setImportDialogOpen: (open: boolean) => void;
}

export function WorkflowCanvasSection({
  selectedWorkflowId,
  previewGraph,
  proposalPreview,
  lifecycleStatus,
  workflows,
  isLoadingWorkflows,
  workflowVersions,
  isLoadingWorkflowVersions,
  isExecuting,
  isPublishing,
  isRestoringVersion,
  canRun,
  canPublish,
  publishDisabledReason,
  runDisabledReason,
  isImportDialogOpen,
  onNodeDoubleClick,
  onNodeDrop,
  onRunClick,
  onPublishClick,
  onVersionRestore,
  onLoadWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
  onNewWorkflow,
  onExportWorkflow,
  onImportDialogOpen,
  onImportWorkflow,
  setImportDialogOpen,
}: WorkflowCanvasSectionProps) {
  const isPreviewActive = Boolean(previewGraph);

  return (
    <ReactFlowProvider>
      <div className="flex-1 relative overflow-hidden">
        <WorkflowCanvas
          key={selectedWorkflowId ?? 'new'}
          previewGraph={previewGraph}
          onNodeDoubleClick={isPreviewActive ? undefined : onNodeDoubleClick}
          onNodeDrop={isPreviewActive ? undefined : onNodeDrop}
          readOnly={isPreviewActive}
        />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none">
          <div className="pointer-events-auto">
            <WorkflowLifecycleBar
              lifecycleStatus={lifecycleStatus}
              onRunClick={onRunClick}
              onPublishClick={onPublishClick}
              isExecuting={isExecuting}
              isPublishing={isPublishing}
              isRestoringVersion={isRestoringVersion}
              canRun={canRun}
              canPublish={canPublish}
              publishDisabledReason={publishDisabledReason}
              runDisabledReason={runDisabledReason}
              versionOptions={workflowVersions}
              isVersionsLoading={isLoadingWorkflowVersions}
              onVersionRestore={onVersionRestore}
              versionRestoreDisabledReason={
                selectedWorkflowId ? undefined : 'Save the workflow before restoring versions'
              }
            />
          </div>
          {proposalPreview && (
            <div className="pointer-events-auto">
              <div className="bg-sky-900/90 text-white px-4 py-2 rounded-full shadow-lg max-w-xl text-center">
                <p className="text-sm font-medium">Previewing workflow proposal</p>
                <p className="text-xs text-slate-100 line-clamp-2">
                  {proposalPreview.proposal.summary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Workflows Panel */}
        <FloatingWorkflowsPanel
          workflows={workflows}
          isLoadingWorkflows={isLoadingWorkflows}
          selectedWorkflowId={selectedWorkflowId}
          onLoadWorkflow={onLoadWorkflow}
          onDeleteWorkflow={onDeleteWorkflow}
          onRenameWorkflow={onRenameWorkflow}
          onNewWorkflow={onNewWorkflow}
          onExportWorkflow={onExportWorkflow}
          onImportWorkflow={onImportDialogOpen}
        />

        {/* Workflow Import Dialog */}
        <WorkflowImportDialog
          open={isImportDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={onImportWorkflow}
        />
      </div>
    </ReactFlowProvider>
  );
}

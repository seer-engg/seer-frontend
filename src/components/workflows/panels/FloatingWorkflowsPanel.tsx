/**
 * Floating Workflows Panel Component
 *
 * Figma-style floating panel for workflow navigation.
 * Positioned over the canvas with nested menu structure.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, FileEdit, Trash2, ChevronDown, ChevronUp, Upload, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowListRow {
  workflow_id: string;
  name: string;
  updated_at: string;
  draft_revision?: number;
  description?: string | null;
}

interface FloatingWorkflowsPanelProps {
  workflows?: WorkflowListRow[];
  isLoadingWorkflows?: boolean;
  selectedWorkflowId?: string | null;
  onLoadWorkflow?: (workflow: WorkflowListRow) => void;
  onDeleteWorkflow?: (workflowId: string) => void;
  onRenameWorkflow?: (workflowId: string, newName: string) => Promise<void>;
  onNewWorkflow?: () => void;
  onCopyLink?: (workflowId: string) => void;
  onDuplicateWorkflow?: (workflowId: string) => void;
  onExportWorkflow?: (workflowId: string) => void;
  onImportWorkflow?: () => void;
}

interface PanelHeaderProps {
  isExpanded: boolean;
  onImportWorkflow?: () => void;
  onNewWorkflow?: () => void;
}

interface WorkflowItemProps {
  w: WorkflowListRow;
  selectedWorkflowId?: string | null;
  editingWorkflowId: string | null;
  editingName: string;
  isRenaming: boolean;
  setEditingWorkflowId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  handleSaveRename: (id: string) => void;
  resetRename: () => void;
  onLoadWorkflow?: (workflow: WorkflowListRow) => void;
  onDeleteWorkflow?: (workflowId: string) => void;
  onRenameWorkflow?: (workflowId: string, newName: string) => Promise<void>;
  onExportWorkflow?: (workflowId: string) => void;
}

const useRenameState = () => {
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  return { editingWorkflowId, editingName, isRenaming, setEditingWorkflowId, setEditingName, setIsRenaming };
};

const PanelHeader = ({ isExpanded, onImportWorkflow, onNewWorkflow }: PanelHeaderProps) => (
  <div className="flex items-center justify-between px-4 py-3 border-b">
    <div className="flex items-center gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <h3 className="text-sm font-semibold">Workflows</h3>
    </div>
    <div className="flex items-center gap-1">
      {onImportWorkflow && (
        <Button variant="ghost" size="icon" onClick={onImportWorkflow} className="h-6 w-6" title="Import">
          <Upload className="w-4 h-4" />
        </Button>
      )}
      {onNewWorkflow && (
        <Button variant="ghost" size="icon" onClick={onNewWorkflow} className="h-6 w-6" title="New">
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  </div>
);

const WorkflowItem = ({
  w,
  selectedWorkflowId,
  editingWorkflowId,
  editingName,
  isRenaming,
  setEditingWorkflowId,
  setEditingName,
  handleSaveRename,
  resetRename,
  onLoadWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
  onExportWorkflow,
}: WorkflowItemProps) => (
  <div
    key={w.workflow_id}
    className={cn(
      'px-4 py-2 hover:bg-accent transition-colors cursor-pointer flex items-center justify-between group',
      selectedWorkflowId === w.workflow_id && 'bg-accent',
    )}
    onClick={() => editingWorkflowId !== w.workflow_id && onLoadWorkflow?.(w)}
  >
    <div className="flex-1 min-w-0 text-left">
      {editingWorkflowId === w.workflow_id ? (
        <Input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={() => handleSaveRename(w.workflow_id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveRename(w.workflow_id);
            else if (e.key === 'Escape') resetRename();
          }}
          className="h-7 text-sm"
          disabled={isRenaming}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{w.name}</p>
          <span className="text-xs text-muted-foreground">{new Date(w.updated_at).toLocaleDateString()}</span>
        </div>
      )}
    </div>
    {editingWorkflowId !== w.workflow_id && (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onExportWorkflow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onExportWorkflow(w.workflow_id);
            }}
            title="Export"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        {onRenameWorkflow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setEditingWorkflowId(w.workflow_id);
              setEditingName(w.name);
            }}
            title="Rename"
          >
            <FileEdit className="w-4 h-4" />
          </Button>
        )}
        {onDeleteWorkflow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWorkflow(w.workflow_id);
            }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    )}
  </div>
);

export function FloatingWorkflowsPanel({
  workflows = [],
  isLoadingWorkflows = false,
  selectedWorkflowId,
  onLoadWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
  onNewWorkflow,
  onExportWorkflow,
  onImportWorkflow,
}: FloatingWorkflowsPanelProps) {
  const { editingWorkflowId, editingName, isRenaming, setEditingWorkflowId, setEditingName, setIsRenaming } = useRenameState();
  const [isExpanded, setIsExpanded] = useState(true);

  const resetRename = () => { setEditingWorkflowId(null); setEditingName(''); };

  const handleSaveRename = async (id: string) => {
    if (!onRenameWorkflow || !editingName.trim()) { resetRename(); return; }
    const trimmed = editingName.trim();
    if (trimmed === workflows.find((w) => w.workflow_id === id)?.name) { resetRename(); return; }
    setIsRenaming(true);
    try { await onRenameWorkflow(id, trimmed); resetRename(); } catch (e) { console.error('Rename failed:', e); } finally { setIsRenaming(false); }
  };

  return (
    <div className="absolute top-4 left-4 z-50 w-[280px] bg-card border border-border rounded-lg shadow-lg backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <PanelHeader isExpanded={isExpanded} onImportWorkflow={onImportWorkflow} onNewWorkflow={onNewWorkflow} />
        <CollapsibleContent>
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingWorkflows ? <div className="text-sm text-muted-foreground text-left py-4 px-4">Loading...</div> : !workflows.length ? <div className="text-sm text-muted-foreground text-left py-4 px-4">No saved workflows yet</div> : <div className="py-2">{workflows.map(w => <WorkflowItem key={w.workflow_id} w={w} selectedWorkflowId={selectedWorkflowId} editingWorkflowId={editingWorkflowId} editingName={editingName} isRenaming={isRenaming} setEditingWorkflowId={setEditingWorkflowId} setEditingName={setEditingName} handleSaveRename={handleSaveRename} resetRename={resetRename} onLoadWorkflow={onLoadWorkflow} onDeleteWorkflow={onDeleteWorkflow} onRenameWorkflow={onRenameWorkflow} onExportWorkflow={onExportWorkflow} />)}</div>}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

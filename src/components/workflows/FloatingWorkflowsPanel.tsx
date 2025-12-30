/**
 * Floating Workflows Panel Component
 * 
 * Figma-style floating panel for workflow navigation.
 * Positioned over the canvas with nested menu structure.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MoreHorizontal, Plus, FileEdit, Trash2, Copy, CopyCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowListRow {
  workflow_id: string;
  name: string;
  updated_at: string;
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
}

export function FloatingWorkflowsPanel({
  workflows = [],
  isLoadingWorkflows = false,
  selectedWorkflowId,
  onLoadWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
  onNewWorkflow,
  onCopyLink,
  onDuplicateWorkflow,
}: FloatingWorkflowsPanelProps) {
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [copiedWorkflowId, setCopiedWorkflowId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleStartRename = (e: React.MouseEvent, workflow: WorkflowListRow) => {
    e.stopPropagation();
    setEditingWorkflowId(workflow.workflow_id);
    setEditingName(workflow.name);
  };

  const handleCancelRename = () => {
    setEditingWorkflowId(null);
    setEditingName('');
  };

  const handleSaveRename = async (workflowId: string) => {
    if (!onRenameWorkflow || !editingName.trim()) {
      handleCancelRename();
      return;
    }

    const trimmedName = editingName.trim();
    if (trimmedName === workflows.find((w) => w.workflow_id === workflowId)?.name) {
      handleCancelRename();
      return;
    }

    setIsRenaming(true);
    try {
      await onRenameWorkflow(workflowId, trimmedName);
      setEditingWorkflowId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      // Keep editing state on error so user can retry
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, workflowId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(workflowId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleCopyLink = (workflowId: string) => {
    if (onCopyLink) {
      onCopyLink(workflowId);
    } else {
      // Fallback: copy workflow ID to clipboard
      navigator.clipboard.writeText(window.location.origin + `/workflows/${workflowId}`);
      setCopiedWorkflowId(workflowId);
      setTimeout(() => setCopiedWorkflowId(null), 2000);
    }
  };

  const handleDuplicate = (workflowId: string) => {
    if (onDuplicateWorkflow) {
      onDuplicateWorkflow(workflowId);
    }
  };

  const handleDelete = (workflowId: string) => {
    if (onDeleteWorkflow && confirm('Are you sure you want to delete this workflow?')) {
      onDeleteWorkflow(workflowId);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-50 w-[280px] bg-card border border-border rounded-lg shadow-lg backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title={isExpanded ? 'Collapse workflows' : 'Expand workflows'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <h3 className="text-sm font-semibold">Workflows</h3>
          </div>
          {onNewWorkflow && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewWorkflow}
              className="h-6 w-6"
              title="New workflow"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Workflows List */}
        <CollapsibleContent>
          <div className="max-h-[400px] overflow-y-auto">
        {isLoadingWorkflows ? (
          <div className="text-sm text-muted-foreground text-left py-4 px-4">
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-left py-4 px-4">
            No saved workflows yet
          </div>
        ) : (
          <div className="py-2">
            {workflows.map((workflow) => (
              <div
                key={workflow.workflow_id}
                className={cn(
                  'px-4 py-2 hover:bg-accent transition-colors cursor-pointer flex items-center justify-between group',
                  selectedWorkflowId === workflow.workflow_id && 'bg-accent',
                )}
                onClick={() => {
                  if (editingWorkflowId !== workflow.workflow_id && onLoadWorkflow) {
                    onLoadWorkflow(workflow);
                  }
                }}
              >
                <div className="flex-1 min-w-0 text-left">
                  {editingWorkflowId === workflow.workflow_id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleSaveRename(workflow.workflow_id)}
                      onKeyDown={(e) => handleRenameKeyDown(e, workflow.workflow_id)}
                      className="h-7 text-sm"
                      disabled={isRenaming}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{workflow.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(workflow.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                {editingWorkflowId !== workflow.workflow_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onCopyLink && (
                        <DropdownMenuItem onClick={() => handleCopyLink(workflow.workflow_id)}>
                          {copiedWorkflowId === workflow.workflow_id ? (
                            <>
                              <CopyCheck className="w-4 h-4 mr-2" />
                              Link copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy link to page
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {onRenameWorkflow && (
                        <DropdownMenuItem onClick={(e) => handleStartRename(e, workflow)}>
                          <FileEdit className="w-4 h-4 mr-2" />
                          Rename page
                        </DropdownMenuItem>
                      )}
                      {onDuplicateWorkflow && (
                        <DropdownMenuItem onClick={() => handleDuplicate(workflow.workflow_id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate page
                        </DropdownMenuItem>
                      )}
                      {onDeleteWorkflow && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(workflow.workflow_id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete page
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}


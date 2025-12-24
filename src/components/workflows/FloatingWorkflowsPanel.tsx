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
import { MoreHorizontal, Plus, FileEdit, Trash2, Copy, CopyCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workflow {
  id: number;
  name: string;
  updated_at: string;
  graph_data?: any;
}

interface FloatingWorkflowsPanelProps {
  workflows?: Workflow[];
  isLoadingWorkflows?: boolean;
  selectedWorkflowId?: number | null;
  onLoadWorkflow?: (workflow: Workflow) => void;
  onDeleteWorkflow?: (workflowId: number) => void;
  onRenameWorkflow?: (workflowId: number, newName: string) => Promise<void>;
  onNewWorkflow?: () => void;
  onCopyLink?: (workflowId: number) => void;
  onDuplicateWorkflow?: (workflowId: number) => void;
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
  const [editingWorkflowId, setEditingWorkflowId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [copiedWorkflowId, setCopiedWorkflowId] = useState<number | null>(null);

  const handleStartRename = (e: React.MouseEvent, workflow: Workflow) => {
    e.stopPropagation();
    setEditingWorkflowId(workflow.id);
    setEditingName(workflow.name);
  };

  const handleCancelRename = () => {
    setEditingWorkflowId(null);
    setEditingName('');
  };

  const handleSaveRename = async (workflowId: number) => {
    if (!onRenameWorkflow || !editingName.trim()) {
      handleCancelRename();
      return;
    }

    const trimmedName = editingName.trim();
    if (trimmedName === workflows.find(w => w.id === workflowId)?.name) {
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

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, workflowId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(workflowId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleCopyLink = (workflowId: number) => {
    if (onCopyLink) {
      onCopyLink(workflowId);
    } else {
      // Fallback: copy workflow ID to clipboard
      navigator.clipboard.writeText(window.location.origin + `/workflows/${workflowId}`);
      setCopiedWorkflowId(workflowId);
      setTimeout(() => setCopiedWorkflowId(null), 2000);
    }
  };

  const handleDuplicate = (workflowId: number) => {
    if (onDuplicateWorkflow) {
      onDuplicateWorkflow(workflowId);
    }
  };

  const handleDelete = (workflowId: number) => {
    if (onDeleteWorkflow && confirm('Are you sure you want to delete this workflow?')) {
      onDeleteWorkflow(workflowId);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-50 w-[280px] bg-card border border-border rounded-lg shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Workflows</h3>
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
                key={workflow.id}
                className={cn(
                  'px-4 py-2 hover:bg-accent transition-colors cursor-pointer flex items-center justify-between group',
                  selectedWorkflowId === workflow.id && 'bg-accent'
                )}
                onClick={() => {
                  if (editingWorkflowId !== workflow.id && onLoadWorkflow) {
                    onLoadWorkflow(workflow);
                  }
                }}
              >
                <div className="flex-1 min-w-0 text-left">
                  {editingWorkflowId === workflow.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleSaveRename(workflow.id)}
                      onKeyDown={(e) => handleRenameKeyDown(e, workflow.id)}
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
                {editingWorkflowId !== workflow.id && (
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
                        <DropdownMenuItem onClick={() => handleCopyLink(workflow.id)}>
                          {copiedWorkflowId === workflow.id ? (
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
                        <DropdownMenuItem onClick={() => handleDuplicate(workflow.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate page
                        </DropdownMenuItem>
                      )}
                      {onDeleteWorkflow && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(workflow.id)}
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
    </div>
  );
}


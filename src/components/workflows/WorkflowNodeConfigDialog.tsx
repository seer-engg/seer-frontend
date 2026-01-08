import { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { BlockConfigPanel } from './BlockConfigPanel';
import { WorkflowEdge, WorkflowNodeData } from './types';

interface WorkflowNodeConfigDialogProps {
  open: boolean;
  node: Node<WorkflowNodeData> | null;
  allNodes: Node<WorkflowNodeData>[];
  allEdges: WorkflowEdge[];
  onOpenChange: (open: boolean) => void;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}

export function WorkflowNodeConfigDialog({
  open,
  node,
  allNodes,
  allEdges,
  onOpenChange,
  onUpdate,
}: WorkflowNodeConfigDialogProps) {
  const isMobile = useIsMobile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Track original node for comparison
  const originalNodeRef = useRef<Node<WorkflowNodeData> | null>(null);

  // Reset when node changes
  useEffect(() => {
    if (node?.id !== originalNodeRef.current?.id) {
      originalNodeRef.current = node ? JSON.parse(JSON.stringify(node)) : null;
      setHasUnsavedChanges(false);
      setPendingClose(false);
    }
  }, [node?.id]);

  // Detect changes by comparing current node with original
  useEffect(() => {
    if (!node || !originalNodeRef.current) return;

    const currentConfig = JSON.stringify(node.data.config);
    const originalConfig = JSON.stringify(originalNodeRef.current.data.config);
    const currentOauth = node.data.oauth_scope;
    const originalOauth = originalNodeRef.current.data.oauth_scope;

    const hasChanges =
      currentConfig !== originalConfig || currentOauth !== originalOauth;
    setHasUnsavedChanges(hasChanges);
  }, [node?.data.config, node?.data.oauth_scope]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!node || !hasUnsavedChanges) return;

    onUpdate(node.id, {
      config: node.data.config,
      oauth_scope: node.data.oauth_scope,
    });

    setHasUnsavedChanges(false);
    originalNodeRef.current = node ? JSON.parse(JSON.stringify(node)) : null;

    toast.success('Configuration saved', {
      description: 'Block configuration has been saved successfully',
    });

    if (pendingClose) {
      setPendingClose(false);
      onOpenChange(false);
    }
  }, [node, hasUnsavedChanges, onUpdate, onOpenChange, pendingClose]);

  // Handle dialog close attempt
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && hasUnsavedChanges) {
        setShowDiscardDialog(true);
        return;
      }
      onOpenChange(newOpen);
    },
    [hasUnsavedChanges, onOpenChange]
  );

  // Discard changes and close
  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Save and close
  const handleSaveAndClose = useCallback(() => {
    setShowDiscardDialog(false);
    setPendingClose(true);
    handleSave();
  }, [handleSave]);

  // Register Ctrl+S shortcut
  useKeyboardShortcut({
    key: 's',
    modifiers: { ctrl: true, meta: true },
    handler: handleSave,
    category: 'Dialog Actions',
    description: 'Save configuration',
    scope: 'dialog',
    enabled: open && hasUnsavedChanges,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="text-left">
            <DialogTitle>{node?.data.label ?? 'Configure block'}</DialogTitle>
            <DialogDescription>
              Update block parameters, inputs, and outputs.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
            {node ? (
              <BlockConfigPanel
                node={node}
                onUpdate={onUpdate}
                allNodes={allNodes}
                allEdges={allEdges}
                autoSave={false}
                variant="inline"
                liveUpdate={false}
                showSaveButton={false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a block to configure.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel {!isMobile && <Kbd className="ml-1.5">Esc</Kbd>}
            </Button>
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              Save Configuration{' '}
              {!isMobile && <Kbd className="ml-1.5">⌘S</Kbd>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard changes confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before
              closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose}>
              Save & Close
            </AlertDialogAction>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



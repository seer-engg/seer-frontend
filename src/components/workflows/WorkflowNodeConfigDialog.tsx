import { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { BlockConfigPanel } from './BlockConfigPanel';
import { WorkflowEdge, WorkflowNodeData } from './types';
import { backendApiClient } from '@/lib/api-client';
import { ToolMetadata } from './block-config';
import {
  validateToolConfig,
  validateLlmConfig,
  validateIfElseConfig,
  validateForLoopConfig,
  type ValidationResult,
} from './block-config/validation';

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Track local edits from BlockConfigPanel (for change detection without triggering autosave)
  const [localConfig, setLocalConfig] = useState<Record<string, any> | null>(null);
  const [localOauthScope, setLocalOauthScope] = useState<string | undefined>(undefined);

  // Track original node for comparison
  const originalNodeRef = useRef<Node<WorkflowNodeData> | null>(null);

  // Fetch tool schema for tool blocks (for validation)
  const toolName = node?.data.type === 'tool' ? (node.data.config?.tool_name || node.data.config?.toolName) : '';
  const { data: toolSchema } = useQuery<ToolMetadata | undefined>({
    queryKey: ['tool-schema', toolName],
    queryFn: async () => {
      if (!toolName || node?.data.type !== 'tool') return undefined;
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools.find(t => t.name === toolName);
    },
    enabled: !!toolName && node?.data.type === 'tool',
    staleTime: 5 * 60 * 1000,
  });

  // Reset when node changes
  useEffect(() => {
    if (node?.id !== originalNodeRef.current?.id) {
      originalNodeRef.current = node ? JSON.parse(JSON.stringify(node)) : null;
      setLocalConfig(null);
      setLocalOauthScope(undefined);
      setHasUnsavedChanges(false);
      setPendingClose(false);
    }
  }, [node?.id]);

  // Detect changes by comparing LOCAL state with original node
  useEffect(() => {
    if (!node || !originalNodeRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    // Use local state if available, otherwise fall back to node state
    const currentConfig = localConfig ?? node.data.config;
    const currentOauth = localOauthScope ?? node.data.oauth_scope;
    const originalConfig = originalNodeRef.current.data.config;
    const originalOauth = originalNodeRef.current.data.oauth_scope;

    const hasChanges =
      JSON.stringify(currentConfig) !== JSON.stringify(originalConfig) ||
      currentOauth !== originalOauth;

    setHasUnsavedChanges(hasChanges);
  }, [node, localConfig, localOauthScope]);

  // Validate configuration when node changes
  useEffect(() => {
    if (!node) {
      setValidationErrors({});
      return;
    }

    let validation: ValidationResult;

    switch (node.data.type) {
      case 'tool':
        const paramSchema = toolSchema?.parameters?.properties || {};
        const requiredParams = toolSchema?.parameters?.required || [];
        validation = validateToolConfig(node.data.config, paramSchema, requiredParams);
        break;
      case 'llm':
        validation = validateLlmConfig(node.data.config);
        break;
      case 'if_else':
        validation = validateIfElseConfig(node.data.config);
        break;
      case 'for_loop':
        validation = validateForLoopConfig(node.data.config);
        break;
      default:
        validation = { isValid: true, errors: {} };
    }

    setValidationErrors(validation.errors);
  }, [node?.data.config, node?.data.type, toolSchema]);

  // Compute validation state
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const validationErrorCount = Object.keys(validationErrors).length;

  // Save handler - uses LOCAL state, not node state
  const handleSave = useCallback(() => {
    if (!node || !hasUnsavedChanges || hasValidationErrors) return;

    // Use local state if available, otherwise fall back to node state
    const finalConfig = localConfig ?? node.data.config;
    const finalOauthScope = localOauthScope ?? node.data.oauth_scope;

    // Update parent state - this triggers autosave which persists to backend
    onUpdate(node.id, {
      config: finalConfig,
      oauth_scope: finalOauthScope,
    });

    // Reset local state after save
    setLocalConfig(null);
    setLocalOauthScope(undefined);
    setHasUnsavedChanges(false);

    // Update original ref with the saved state
    originalNodeRef.current = node ? JSON.parse(JSON.stringify({
      ...node,
      data: { ...node.data, config: finalConfig, oauth_scope: finalOauthScope }
    })) : null;

    toast.success('Configuration saved', {
      description: 'Block configuration has been saved successfully',
    });

    if (pendingClose) {
      setPendingClose(false);
      onOpenChange(false);
    }
  }, [node, localConfig, localOauthScope, hasUnsavedChanges, hasValidationErrors, onUpdate, onOpenChange, pendingClose]);

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

  // Handle local config changes from BlockConfigPanel (for change detection only, doesn't trigger parent update)
  const handleLocalConfigChange = useCallback(
    (config: Record<string, any>, oauthScope?: string) => {
      // Just update local state - no parent update, no autosave trigger
      setLocalConfig(config);
      setLocalOauthScope(oauthScope);
    },
    []
  );

  // Register Ctrl+S shortcut
  useKeyboardShortcut({
    key: 's',
    modifiers: { ctrl: true, meta: true },
    handler: handleSave,
    category: 'Dialog Actions',
    description: 'Save configuration',
    scope: 'dialog',
    enabled: open && hasUnsavedChanges && !hasValidationErrors,
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

          <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
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
                validationErrors={validationErrors}
                onChange={handleConfigChange}
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
            {hasValidationErrors ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || hasValidationErrors}
                    >
                      Save {!isMobile && <Kbd className="ml-1.5">⌘S</Kbd>}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {validationErrorCount} validation{' '}
                    {validationErrorCount === 1 ? 'error' : 'errors'}. Fix errors
                    before saving.
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
                Save {!isMobile && <Kbd className="ml-1.5">⌘S</Kbd>}
              </Button>
            )}
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



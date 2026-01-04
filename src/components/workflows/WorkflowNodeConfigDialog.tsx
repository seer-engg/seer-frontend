import { Node } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="text-left">
          <DialogTitle>{node?.data.label ?? 'Configure block'}</DialogTitle>
          <DialogDescription>
            Update block parameters, inputs, and outputs. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {node ? (
            <BlockConfigPanel
              node={node}
              onUpdate={onUpdate}
              allNodes={allNodes}
              allEdges={allEdges}
              autoSave={false}
              variant="inline"
              liveUpdate
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a block to configure.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



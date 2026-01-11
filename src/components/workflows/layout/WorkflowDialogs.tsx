import { WorkflowNodeConfigDialog } from '@/components/workflows/dialogs/WorkflowNodeConfigDialog';
import { WorkflowInputDialog } from '@/components/workflows/dialogs/WorkflowInputDialog';
import { KeymapDialog } from '@/components/general/KeymapDialog';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowEdge } from '@/components/workflows/types';
import type { InputDef } from '@/types/workflow-spec';

interface WorkflowDialogsProps {
  isConfigDialogOpen: boolean;
  isInputDialogOpen: boolean;
  isKeymapOpen: boolean;
  editingNode: Node<WorkflowNodeData> | null;
  allNodes: Node<WorkflowNodeData>[];
  allEdges: WorkflowEdge[];
  workflowInputsDef: Record<string, InputDef>;
  inputFields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    variableName: string;
  }>;
  inputData: Record<string, unknown>;
  onConfigDialogOpenChange: (open: boolean) => void;
  onNodeConfigUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  setInputDialogOpen: (open: boolean) => void;
  setInputData: (data: Record<string, unknown>) => void;
  setKeymapOpen: (open: boolean) => void;
  onExecuteWithInput: () => void;
}

export function WorkflowDialogs({
  isConfigDialogOpen,
  isInputDialogOpen,
  isKeymapOpen,
  editingNode,
  allNodes,
  allEdges,
  workflowInputsDef,
  inputFields,
  inputData,
  onConfigDialogOpenChange,
  onNodeConfigUpdate,
  setInputDialogOpen,
  setInputData,
  setKeymapOpen,
  onExecuteWithInput,
}: WorkflowDialogsProps) {
  return (
    <>
      <WorkflowNodeConfigDialog
        open={isConfigDialogOpen}
        node={editingNode}
        allNodes={allNodes}
        allEdges={allEdges}
        onOpenChange={onConfigDialogOpenChange}
        onUpdate={onNodeConfigUpdate}
        workflowInputs={workflowInputsDef}
      />

      <WorkflowInputDialog
        open={isInputDialogOpen}
        onOpenChange={setInputDialogOpen}
        inputFields={inputFields}
        inputData={inputData}
        onInputDataChange={setInputData}
        onExecute={onExecuteWithInput}
      />

      <KeymapDialog open={isKeymapOpen} onOpenChange={setKeymapOpen} />
    </>
  );
}

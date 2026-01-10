import { memo } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';

import type { WorkflowNodeData, TriggerNodeMeta } from '../../types';
import { useBaseTrigger } from './components/useBaseTrigger';
import { TriggerBlockNodeView } from './components/TriggerBlockNodeView';
import { saveTrigger } from './components/saveHandlers';
import { useTriggerConfig } from './triggers/useTriggerConfig';

type WorkflowNode = FlowNode<WorkflowNodeData>;

/**
 * Inner component that uses hooks - only rendered when triggerMeta exists.
 */
function TriggerBlockNodeInner({
  triggerMeta,
  selected,
}: {
  triggerMeta: TriggerNodeMeta;
  selected?: boolean;
}) {
  const { subscription, descriptor, handlers, integration, draft } = triggerMeta;
  const triggerKey = subscription?.trigger_key ?? draft?.triggerKey ?? '';

  const baseTriggerResult = useBaseTrigger(triggerMeta);
  const { kind: triggerKind, state: configState, quickOptions, isLoading, buildSavePayload } = useTriggerConfig(
    triggerKey,
    triggerMeta,
  );

  const {
    bindingState,
    isExpanded,
    setIsExpanded,
    isSaving,
    setIsSaving,
    isToggling,
    isDeleting,
    showInputsEditor,
    setShowInputsEditor,
    isSavingWorkflowInput,
    inputDraft,
    setInputDraft,
    workflowInputEntries,
    hasInputs,
    canManageInputs,
    isDraft,
    handleCreateWorkflowInput,
    handleRemoveWorkflowInput,
    handleToggle,
    handleDelete,
    handleBindingModeChange,
    handleBindingValueChange,
    bindingQuickInsert,
  } = baseTriggerResult;

  const handleSave = () => {
    const payload = buildSavePayload({ bindingState, subscription, draft });
    if (!payload || !handlers) return;
    saveTrigger({ payload, handlers, setIsSaving });
  };

  const viewProps: import('./components/TriggerBlockNodeView').TriggerBlockNodeViewProps = {
    selected,
    descriptor,
    subscription,
    triggerKey,
    triggerKind,
    integration,
    base: {
      isExpanded,
      setIsExpanded,
      isDraft,
      hasInputs,
      canManageInputs,
      showInputsEditor,
      setShowInputsEditor,
      workflowInputEntries,
      isSavingWorkflowInput,
      inputDraft,
      setInputDraft,
      handleCreateWorkflowInput,
      handleRemoveWorkflowInput,
      bindingState,
      handleBindingModeChange,
      handleBindingValueChange,
      bindingQuickInsert,
    },
    actions: {
      isSaving,
      isDeleting,
      isToggling,
      handleToggle,
      handleSave,
      handleDelete,
    },
    config: configState,
    quickOptions,
    isLoading,
  } as const;

  return <TriggerBlockNodeView {...viewProps} />;
}

/**
 * Outer component that handles the null case for triggerMeta.
 */
export const TriggerBlockNode = memo(function TriggerBlockNode({ data, selected }: NodeProps<WorkflowNode>) {
  const triggerMeta = data.triggerMeta;

  if (!triggerMeta) {
    return (
      <div className="rounded-lg border-2 border-destructive/40 bg-card p-4 text-sm text-muted-foreground">
        Trigger metadata unavailable
      </div>
    );
  }

  return <TriggerBlockNodeInner triggerMeta={triggerMeta} selected={selected} />;
});

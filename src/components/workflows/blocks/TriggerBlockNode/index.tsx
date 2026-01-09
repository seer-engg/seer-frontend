import { memo } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';

import type { WorkflowNodeData } from '../../types';
import { WEBHOOK_TRIGGER_KEY } from '../../triggers/constants';
import { useBaseTrigger } from './components/useBaseTrigger';
import { TriggerBlockNodeView } from './components/TriggerBlockNodeView';
import { saveTrigger } from './components/saveHandlers';
import { useTriggerConfig } from './triggers/useTriggerConfig';
import { QUICK_OPTIONS_BY_KIND } from './components/constants';

type WorkflowNode = FlowNode<WorkflowNodeData>;

export const TriggerBlockNode = memo(function TriggerBlockNode({ data, selected }: NodeProps<WorkflowNode>) {
  const triggerMeta = data.triggerMeta;
  const baseTriggerResult = triggerMeta ? useBaseTrigger(triggerMeta) : null;

  if (!triggerMeta) {
    return (
      <div className="rounded-lg border-2 border-destructive/40 bg-card p-4 text-sm text-muted-foreground">
        Trigger metadata unavailable
      </div>
    );
  }

  const { subscription, descriptor, handlers, integration, draft } = triggerMeta;
  const triggerKey = subscription?.trigger_key ?? draft?.triggerKey ?? '';

  const { kind: triggerKind, state: configState, quickOptions, isLoading, buildSavePayload } = useTriggerConfig(
    triggerKey,
    triggerMeta,
  );

  // Destructure hook results
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
    buildBindingsPayload,
  } = baseTriggerResult;

  const isWebhookTrigger = triggerKind === 'webhook' && triggerKey === WEBHOOK_TRIGGER_KEY;

  const handleSave = () => {
    const payload = buildSavePayload({ bindingState, subscription, draft });
    if (!payload || !handlers) return;
    saveTrigger({ payload, handlers, setIsSaving });
  };





  const viewProps = {
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
    quickOptions: quickOptions ?? (triggerKind === 'webhook' ? [] : QUICK_OPTIONS_BY_KIND[triggerKind] ?? []),
    isLoading,
  } as const;

  return <TriggerBlockNodeView {...(viewProps as any)} />;
});

// Removed passthrough wrapper to simplify component


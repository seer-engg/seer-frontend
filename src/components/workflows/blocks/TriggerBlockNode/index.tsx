import { memo } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';

import type { WorkflowNodeData } from '../../types';
import {
  GMAIL_TRIGGER_KEY,
  WEBHOOK_TRIGGER_KEY,
  CRON_TRIGGER_KEY,
  SUPABASE_TRIGGER_KEY,
} from '../../triggers/constants';
import { useBaseTrigger } from './components/useBaseTrigger';
import { useGmailConfig } from './triggers/useGmailConfig';
import { useCronConfig } from './triggers/useCronConfig';
import { useSupabaseConfig } from './triggers/useSupabaseConfig';
import { GMAIL_QUICK_OPTIONS, CRON_QUICK_OPTIONS, SUPABASE_QUICK_OPTIONS } from './components/constants';
import { saveTrigger } from './components/saveHandlers';
import { TriggerBlockNodeView } from './components/TriggerBlockNodeView';
import type { TriggerBlockNodeViewProps } from './components/TriggerBlockNodeView';

type WorkflowNode = FlowNode<WorkflowNodeData>;

export const TriggerBlockNode = memo(function TriggerBlockNode({ data, selected }: NodeProps<WorkflowNode>) {
  const triggerMeta = data.triggerMeta;

  // Call all hooks unconditionally before any early returns
  const baseTriggerResult = triggerMeta ? useBaseTrigger(triggerMeta) : null;
  const gmailConfigResult = triggerMeta ? useGmailConfig(triggerMeta) : null;
  const cronConfigResult = triggerMeta ? useCronConfig(triggerMeta) : null;
  const supabaseConfigResult = triggerMeta ? useSupabaseConfig(triggerMeta) : null;

  if (!triggerMeta) {
    return (
      <div className="rounded-lg border-2 border-destructive/40 bg-card p-4 text-sm text-muted-foreground">
        Trigger metadata unavailable
      </div>
    );
  }

  const { subscription, descriptor, handlers, integration, draft } = triggerMeta;
  const triggerKey = subscription?.trigger_key ?? draft?.triggerKey ?? '';

  // Handle case where handlers might not be provided yet
  if (!handlers || !baseTriggerResult || !gmailConfigResult || !cronConfigResult || !supabaseConfigResult) {
    return (
      <div className="rounded-lg border-2 border-muted bg-card p-4 text-sm text-muted-foreground">
        Loading trigger configuration...
      </div>
    );
  }

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

  // Trigger type checks
  const isSupabaseTrigger = triggerKey === SUPABASE_TRIGGER_KEY;
  const isWebhookTrigger = triggerKey === WEBHOOK_TRIGGER_KEY || isSupabaseTrigger;
  const isGmailTrigger = triggerKey === GMAIL_TRIGGER_KEY;
  const isCronTrigger = triggerKey === CRON_TRIGGER_KEY;

  // Trigger-specific config
  const { gmailConfig, setGmailConfig } = gmailConfigResult;
  const { cronConfig, setCronConfig } = cronConfigResult;
  const { supabaseConfig, setSupabaseConfig, handleSupabaseResourceChange, handleSupabaseEventChange } =
    supabaseConfigResult;

  // Supabase validation (kept if needed elsewhere)
  // const supabaseValidation = isSupabaseTrigger ? validateSupabaseConfig(supabaseConfig) : { valid: true, errors: {} };

  const handleSave = () => {
    saveTrigger({
      triggerKey,
      bindingState,
      subscription,
      draft,
      handlers,
      isDraft,
      isGmailTrigger,
      isCronTrigger,
      isSupabaseTrigger,
      gmailConfig,
      cronConfig,
      supabaseConfig,
      setIsSaving,
    });
  };





  // Determine quick options based on trigger type
  const quickOptions = isGmailTrigger
    ? GMAIL_QUICK_OPTIONS
    : isCronTrigger
      ? CRON_QUICK_OPTIONS
      : isSupabaseTrigger
        ? SUPABASE_QUICK_OPTIONS
        : [];

  const viewProps: TriggerBlockNodeViewProps = {
    selected,
    descriptor,
    subscription,
    triggerKey,
    isCronTrigger,
    isGmailTrigger,
    isSupabaseTrigger,
    isWebhookTrigger,
    integration,
    isExpanded,
    setIsExpanded,
    isSaving,
    isDeleting,
    isToggling,
    isDraft,
    handleToggle,
    handleSave,
    handleDelete,
    gmailConfig,
    setGmailConfig,
    cronConfig,
    setCronConfig,
    supabaseConfig,
    setSupabaseConfig,
    handleSupabaseResourceChange,
    handleSupabaseEventChange,
    canManageInputs,
    showInputsEditor,
    setShowInputsEditor,
    workflowInputEntries,
    isSavingWorkflowInput,
    inputDraft,
    setInputDraft,
    handleCreateWorkflowInput,
    handleRemoveWorkflowInput,
    hasInputs,
    bindingState,
    handleBindingModeChange,
    handleBindingValueChange,
    bindingQuickInsert,
    quickOptions,
  };

  return <TriggerBlockNodeContent props={viewProps} />;
});

// Lightweight content wrapper to reduce parent function length/complexity
function TriggerBlockNodeContent({ props }: { props: TriggerBlockNodeViewProps }) {
  return <TriggerBlockNodeView {...props} />;
}


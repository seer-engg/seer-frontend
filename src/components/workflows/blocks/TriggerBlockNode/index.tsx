import { memo } from 'react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { WorkflowNodeData } from '../../types';
import { validateSupabaseConfig } from '../../triggers/utils';
import {
  GMAIL_TRIGGER_KEY,
  WEBHOOK_TRIGGER_KEY,
  CRON_TRIGGER_KEY,
  SUPABASE_TRIGGER_KEY,
} from '../../triggers/constants';
import { useBaseTrigger, WorkflowInputManager, BindingSection } from './BaseTriggerNode';
import { useGmailConfig, GmailDetailsSection, GmailConfigForm } from './GmailTriggerConfig';
import { useCronConfig, CronDetailsSection, CronConfigForm } from './CronTriggerConfig';
import { useSupabaseConfig, SupabaseConfigForm } from './SupabaseTriggerConfig';
import { WebhookDetailsSection } from './WebhookTriggerConfig';
import { GMAIL_QUICK_OPTIONS, CRON_QUICK_OPTIONS, SUPABASE_QUICK_OPTIONS } from './constants';
import { saveTrigger } from './saveHandlers';
import { TriggerHeader } from './TriggerHeader';
import { TriggerActions } from './TriggerActions';

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

  // Supabase validation
  const supabaseValidation = isSupabaseTrigger ? validateSupabaseConfig(supabaseConfig) : { valid: true, errors: {} };



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

  return (
    <div
      className={cn(
        'min-w-[260px] rounded-xl border-2 bg-card p-4 shadow-sm transition-[border,box-shadow]',
        selected ? 'border-primary shadow-lg' : 'border-border',
      )}
    >
      <TriggerHeader
        descriptor={descriptor}
        subscription={subscription}
        triggerKey={triggerKey}
        isCronTrigger={isCronTrigger}
        isGmailTrigger={isGmailTrigger}
        isSupabaseTrigger={isSupabaseTrigger}
        isToggling={isToggling}
        handleToggle={handleToggle}
      />

      <div className="mt-3 space-y-3">
        {isWebhookTrigger && <WebhookDetailsSection subscription={subscription} />}
        {isGmailTrigger && <GmailDetailsSection integration={integration} />}
        {isCronTrigger && <CronDetailsSection cronConfig={cronConfig} />}

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span>Bindings & configuration</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {isGmailTrigger && <GmailConfigForm gmailConfig={gmailConfig} setGmailConfig={setGmailConfig} />}
            {isCronTrigger && <CronConfigForm cronConfig={cronConfig} setCronConfig={setCronConfig} />}
            {isSupabaseTrigger && (
              <SupabaseConfigForm
                supabaseConfig={supabaseConfig}
                setSupabaseConfig={setSupabaseConfig}
                handleSupabaseResourceChange={handleSupabaseResourceChange}
                handleSupabaseEventChange={handleSupabaseEventChange}
              />
            )}
            <WorkflowInputManager
              canManageInputs={canManageInputs}
              showInputsEditor={showInputsEditor}
              setShowInputsEditor={setShowInputsEditor}
              workflowInputEntries={workflowInputEntries}
              isSavingWorkflowInput={isSavingWorkflowInput}
              inputDraft={inputDraft}
              setInputDraft={setInputDraft}
              handleCreateWorkflowInput={handleCreateWorkflowInput}
              handleRemoveWorkflowInput={handleRemoveWorkflowInput}
            />
            <BindingSection
              hasInputs={hasInputs}
              canManageInputs={canManageInputs}
              workflowInputEntries={workflowInputEntries}
              bindingState={bindingState}
              handleBindingModeChange={handleBindingModeChange}
              handleBindingValueChange={handleBindingValueChange}
              bindingQuickInsert={bindingQuickInsert}
              quickOptions={quickOptions}
            />
          </div>
        )}

        <TriggerActions
          subscription={subscription}
          isDraft={isDraft}
          isSaving={isSaving}
          isDeleting={isDeleting}
          handleSave={handleSave}
          handleDelete={handleDelete}
        />
      </div>
    </div>
  );
});


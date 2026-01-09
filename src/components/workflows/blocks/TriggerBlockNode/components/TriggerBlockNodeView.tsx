import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowNodeData } from '../../../types';
import { TriggerHeader } from './TriggerHeader';
import { TriggerActions } from './TriggerActions';
import { WebhookDetailsSection } from '../triggers/WebhookTriggerConfig';
import { GmailDetailsSection, GmailConfigForm } from '../triggers/GmailTriggerConfig';
import { CronDetailsSection, CronConfigForm } from '../triggers/CronTriggerConfig';
import { SupabaseConfigForm } from '../triggers/SupabaseTriggerConfig';
import { WorkflowInputManager, BindingSection } from './BaseTriggerNode';
import type { InputDef } from '@/types/workflow-spec';
import type { BindingState } from '../../../triggers/utils';
import type { QuickOption } from './BaseTriggerNode';
import type { TriggerKind } from './constants';
import type { TriggerConfigState } from '../triggers/useTriggerConfig';

export interface TriggerBlockNodeViewProps {
  selected?: boolean;
  descriptor: NonNullable<WorkflowNodeData['triggerMeta']>['descriptor'];
  subscription: NonNullable<WorkflowNodeData['triggerMeta']>['subscription'];
  triggerKey: string;
  triggerKind: TriggerKind;
  integration?: NonNullable<WorkflowNodeData['triggerMeta']>['integration'];

  // Base state
  base: {
    isExpanded: boolean;
    setIsExpanded: (updater: (prev: boolean) => boolean) => void;
    isDraft: boolean;
    hasInputs: boolean;
    // Workflow inputs
    canManageInputs: boolean;
    showInputsEditor: boolean;
    setShowInputsEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
    workflowInputEntries: Array<[string, InputDef]>;
    isSavingWorkflowInput: boolean;
    inputDraft: { name: string; type: InputDef['type']; description: string; required: boolean };
    setInputDraft: React.Dispatch<React.SetStateAction<{ name: string; type: InputDef['type']; description: string; required: boolean }>>;
    handleCreateWorkflowInput: () => void;
    handleRemoveWorkflowInput: (inputName: string) => void;
    // Bindings
    bindingState: BindingState;
    handleBindingModeChange: TriggerBlockNodeViewInternalProps['handleBindingModeChange'];
    handleBindingValueChange: TriggerBlockNodeViewInternalProps['handleBindingValueChange'];
    bindingQuickInsert: TriggerBlockNodeViewInternalProps['bindingQuickInsert'];
  };

  // Actions
  actions: {
    isSaving: boolean;
    isDeleting: boolean;
    isToggling: boolean;
    handleToggle: (nextEnabled: boolean) => void;
    handleSave: () => void;
    handleDelete: () => void;
  };

  // Config
  config: TriggerConfigState;
  quickOptions: QuickOption[];
  isLoading: boolean;
}

interface TriggerBlockNodeViewInternalProps {
  handleBindingModeChange: (inputName: string, mode: 'event' | 'literal') => void;
  handleBindingValueChange: (inputName: string, value: string) => void;
  bindingQuickInsert: (inputName: string, value: string) => void;
}

export function TriggerBlockNodeView(props: TriggerBlockNodeViewProps) {
  const {
    selected,
    descriptor,
    subscription,
    triggerKey,
    triggerKind,
    integration,
    base,
    actions,
    config,
    quickOptions,
    isLoading,
  } = props;

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
        triggerKind={triggerKind}
        isToggling={actions.isToggling}
        handleToggle={actions.handleToggle}
      />

      <div className="mt-3 space-y-3">
        {triggerKind === 'webhook' && <WebhookDetailsSection subscription={subscription} />}
        {triggerKind === 'gmail' && <GmailDetailsSection integration={integration} />}        
        {triggerKind === 'cron' && config.kind === 'cron' && <CronDetailsSection cronConfig={config.config} />}

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
          onClick={() => base.setIsExpanded((prev) => !prev)}
        >
          <span>Bindings & configuration</span>
          {base.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {base.isExpanded && (
          <ExpandedConfigSection
            triggerKind={triggerKind}
            config={config}
            canManageInputs={base.canManageInputs}
            showInputsEditor={base.showInputsEditor}
            setShowInputsEditor={base.setShowInputsEditor}
            workflowInputEntries={base.workflowInputEntries}
            isSavingWorkflowInput={base.isSavingWorkflowInput}
            inputDraft={base.inputDraft}
            setInputDraft={base.setInputDraft}
            handleCreateWorkflowInput={base.handleCreateWorkflowInput}
            handleRemoveWorkflowInput={base.handleRemoveWorkflowInput}
            hasInputs={base.hasInputs}
            bindingState={base.bindingState}
            handleBindingModeChange={base.handleBindingModeChange}
            handleBindingValueChange={base.handleBindingValueChange}
            bindingQuickInsert={base.bindingQuickInsert}
            quickOptions={quickOptions}
          />
        )}

        <TriggerActions
          subscription={subscription}
          isDraft={base.isDraft}
          isSaving={actions.isSaving}
          isDeleting={actions.isDeleting}
          handleSave={actions.handleSave}
          handleDelete={actions.handleDelete}
        />
      </div>
    </div>
  );
}

function ExpandedConfigSection({
  triggerKind,
  config,
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
}: {
  triggerKind: TriggerKind;
  config: TriggerConfigState;
  canManageInputs: boolean;
  showInputsEditor: boolean;
  setShowInputsEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
  workflowInputEntries: Array<[string, InputDef]>;
  isSavingWorkflowInput: boolean;
  inputDraft: { name: string; type: InputDef['type']; description: string; required: boolean };
  setInputDraft: React.Dispatch<React.SetStateAction<{ name: string; type: InputDef['type']; description: string; required: boolean }>>;
  handleCreateWorkflowInput: () => void;
  handleRemoveWorkflowInput: (inputName: string) => void;
  hasInputs: boolean;
  bindingState: BindingState;
  handleBindingModeChange: (inputName: string, mode: 'event' | 'literal') => void;
  handleBindingValueChange: (inputName: string, value: string) => void;
  bindingQuickInsert: (inputName: string, value: string) => void;
  quickOptions: QuickOption[];
}) {
  return (
    <div className="space-y-4">
      {triggerKind === 'gmail' && config.kind === 'gmail' && (
        <GmailConfigForm gmailConfig={config.config} setGmailConfig={config.setConfig} />
      )}
      {triggerKind === 'cron' && config.kind === 'cron' && (
        <CronConfigForm cronConfig={config.config} setCronConfig={config.setConfig} />
      )}
      {triggerKind === 'supabase' && config.kind === 'supabase' && (
        <SupabaseConfigForm
          supabaseConfig={config.config}
          setSupabaseConfig={config.setConfig}
          handleSupabaseResourceChange={config.handleSupabaseResourceChange}
          handleSupabaseEventChange={config.handleSupabaseEventChange}
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
  );
}

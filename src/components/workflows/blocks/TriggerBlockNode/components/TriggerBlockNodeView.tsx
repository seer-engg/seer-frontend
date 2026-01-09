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
import type { BindingState } from '../../triggers/utils';
import type { QuickOption } from './BaseTriggerNode';
import type {
  GmailConfigState,
  CronConfigState,
  SupabaseConfigState,
  SupabaseEventType,
} from '../../triggers/utils';

export interface TriggerBlockNodeViewProps {
  selected?: boolean;
  descriptor: NonNullable<WorkflowNodeData['triggerMeta']>['descriptor'];
  subscription: NonNullable<WorkflowNodeData['triggerMeta']>['subscription'];
  triggerKey: string;
  isCronTrigger: boolean;
  isGmailTrigger: boolean;
  isSupabaseTrigger: boolean;
  isWebhookTrigger: boolean;
  integration?: NonNullable<WorkflowNodeData['triggerMeta']>['integration'];

  // Base trigger state
  isExpanded: boolean;
  setIsExpanded: (updater: (prev: boolean) => boolean) => void;
  isSaving: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  isDraft: boolean;

  // Handlers
  handleToggle: (nextEnabled: boolean) => void;
  handleSave: () => void;
  handleDelete: () => void;

  // Gmail
  gmailConfig: GmailConfigState;
  setGmailConfig: React.Dispatch<React.SetStateAction<GmailConfigState>>;
  // Cron
  cronConfig: CronConfigState;
  setCronConfig: React.Dispatch<React.SetStateAction<CronConfigState>>;
  // Supabase
  supabaseConfig: SupabaseConfigState;
  setSupabaseConfig: React.Dispatch<React.SetStateAction<SupabaseConfigState>>;
  handleSupabaseResourceChange: (value: string, label?: string) => void;
  handleSupabaseEventChange: (eventType: SupabaseEventType, nextChecked: boolean) => void;

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
  hasInputs: boolean;
  bindingState: BindingState;
  handleBindingModeChange: TriggerBlockNodeViewInternalProps['handleBindingModeChange'];
  handleBindingValueChange: TriggerBlockNodeViewInternalProps['handleBindingValueChange'];
  bindingQuickInsert: TriggerBlockNodeViewInternalProps['bindingQuickInsert'];
  quickOptions: QuickOption[];
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
          <ExpandedConfigSection
            isGmailTrigger={isGmailTrigger}
            isCronTrigger={isCronTrigger}
            isSupabaseTrigger={isSupabaseTrigger}
            gmailConfig={gmailConfig}
            setGmailConfig={setGmailConfig}
            cronConfig={cronConfig}
            setCronConfig={setCronConfig}
            supabaseConfig={supabaseConfig}
            setSupabaseConfig={setSupabaseConfig}
            handleSupabaseResourceChange={handleSupabaseResourceChange}
            handleSupabaseEventChange={handleSupabaseEventChange}
            canManageInputs={canManageInputs}
            showInputsEditor={showInputsEditor}
            setShowInputsEditor={setShowInputsEditor}
            workflowInputEntries={workflowInputEntries}
            isSavingWorkflowInput={isSavingWorkflowInput}
            inputDraft={inputDraft}
            setInputDraft={setInputDraft}
            handleCreateWorkflowInput={handleCreateWorkflowInput}
            handleRemoveWorkflowInput={handleRemoveWorkflowInput}
            hasInputs={hasInputs}
            bindingState={bindingState}
            handleBindingModeChange={handleBindingModeChange}
            handleBindingValueChange={handleBindingValueChange}
            bindingQuickInsert={bindingQuickInsert}
            quickOptions={quickOptions}
          />
        )}

        <TriggerActions
          subscription={subscription}
          isDraft={props.isDraft}
          isSaving={isSaving}
          isDeleting={isDeleting}
          handleSave={handleSave}
          handleDelete={handleDelete}
        />
      </div>
    </div>
  );
}

function ExpandedConfigSection({
  isGmailTrigger,
  isCronTrigger,
  isSupabaseTrigger,
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
}: Pick<
  TriggerBlockNodeViewProps,
  | 'isGmailTrigger'
  | 'isCronTrigger'
  | 'isSupabaseTrigger'
  | 'gmailConfig'
  | 'setGmailConfig'
  | 'cronConfig'
  | 'setCronConfig'
  | 'supabaseConfig'
  | 'setSupabaseConfig'
  | 'handleSupabaseResourceChange'
  | 'handleSupabaseEventChange'
  | 'canManageInputs'
  | 'showInputsEditor'
  | 'setShowInputsEditor'
  | 'workflowInputEntries'
  | 'isSavingWorkflowInput'
  | 'inputDraft'
  | 'setInputDraft'
  | 'handleCreateWorkflowInput'
  | 'handleRemoveWorkflowInput'
  | 'hasInputs'
  | 'bindingState'
  | 'handleBindingModeChange'
  | 'handleBindingValueChange'
  | 'bindingQuickInsert'
  | 'quickOptions'
>) {
  return (
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
  );
}

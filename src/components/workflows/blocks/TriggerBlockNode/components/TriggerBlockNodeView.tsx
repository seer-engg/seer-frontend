import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTemplateAutocomplete } from '@/hooks/useTemplateAutocomplete';
import type { WorkflowNodeData } from '../../../types';
import type { TriggerDescriptor } from '@/types/triggers';
import { TriggerHeader } from './TriggerHeader';
import { TriggerActions } from './TriggerActions';
import { WebhookDetailsSection } from '../triggers/WebhookTriggerConfig';
import { GmailDetailsSection } from '../triggers/GmailTriggerConfig';
import { DynamicTriggerConfigForm } from '../triggers/DynamicTriggerConfigForm';
import { UserSchemaEditor } from '../triggers/UserSchemaEditor';
import { WorkflowInputManager } from './BaseTriggerNode';
import type { InputDef } from '@/types/workflow-spec';
import type { BindingState } from '../../../triggers/utils';
import type { QuickOption } from './BaseTriggerNode';
import type { TriggerKind, TriggerConfigState } from '../triggers/useTriggerConfig';

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
  } = props;

  // Minimal template autocomplete for trigger configs (triggers don't typically need template variables)
  const templateAutocomplete = useTemplateAutocomplete([]);

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
        {triggerKind === 'cron' && config.kind === 'dynamic' && (
          <CronDetailsSectionFromConfig configValues={config.configValues} />
        )}

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
            descriptor={descriptor}
            templateAutocomplete={templateAutocomplete}
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

/**
 * Shows cron details from dynamic config values.
 */
function CronDetailsSectionFromConfig({ configValues }: { configValues: Record<string, unknown> }) {
  const cronExpression = String(configValues.cron_expression ?? '');
  const timezone = String(configValues.timezone ?? 'UTC');
  const description = configValues.description ? String(configValues.description) : undefined;

  if (!cronExpression) {
    return null;
  }

  return (
    <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Schedule configuration
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Expression</p>
        <code className="text-xs block">{cronExpression}</code>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Timezone</p>
        <p className="text-xs font-medium">{timezone}</p>
      </div>
      {description && (
        <div className="space-y-1.5 pt-1.5 border-t border-dashed border-border/60">
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="text-xs">{description}</p>
        </div>
      )}
    </div>
  );
}

interface ExpandedConfigSectionProps {
  triggerKind: TriggerKind;
  config: TriggerConfigState;
  descriptor?: TriggerDescriptor;
  templateAutocomplete: ReturnType<typeof useTemplateAutocomplete>;
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
}

function ExpandedConfigSection({
  triggerKind,
  config,
  descriptor,
  templateAutocomplete,
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
}: ExpandedConfigSectionProps) {
  return (
    <div className="space-y-4">
      {/* Dynamic config form for triggers with config_schema */}
      {config.kind === 'dynamic' && descriptor?.config_schema && (
        <DynamicTriggerConfigForm
          configSchema={descriptor.config_schema}
          configValues={config.configValues}
          onConfigChange={config.setConfigValue}
          provider={descriptor.provider}
          templateAutocomplete={templateAutocomplete}
        />
      )}

      {/* User schema editor for webhook/form triggers */}
      {config.kind === 'webhook' && (triggerKind === 'webhook' || triggerKind === 'form') && (
        <UserSchemaEditor
          schema={config.userSchema}
          onChange={config.setUserSchema}
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
    </div>
  );
}

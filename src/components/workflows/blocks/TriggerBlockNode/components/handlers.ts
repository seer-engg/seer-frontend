import { toast } from '@/components/ui/sonner';
import type { WorkflowNodeData } from '../../../types';
import type { InputDef } from '@/types/workflow-spec';
import type { BindingState } from '../../../triggers/utils';
import { INPUT_NAME_REGEX } from './inputConstants';

export const createWorkflowInput = async (
  inputDraft: { name: string; type: InputDef['type']; description: string; required: boolean },
  workflowInputs: Record<string, InputDef> | undefined,
  updateWorkflowInputs: ((inputs: Record<string, InputDef>) => Promise<void>) | undefined,
  onSuccess: (inputName: string) => void,
) => {
  if (!updateWorkflowInputs) {
    toast.error('Unable to edit workflow inputs');
    return;
  }
  const trimmedName = inputDraft.name.trim();
  if (!trimmedName) {
    toast.error('Input name is required');
    return;
  }
  if (!INPUT_NAME_REGEX.test(trimmedName)) {
    toast.error('Use letters, numbers, or underscores (no spaces) for input names');
    return;
  }
  if (workflowInputs && workflowInputs[trimmedName]) {
    toast.error('An input with this name already exists');
    return;
  }
  const nextInputs: Record<string, InputDef> = {
    ...(workflowInputs ?? {}),
    [trimmedName]: {
      type: inputDraft.type,
      required: inputDraft.required,
      description: inputDraft.description.trim() || undefined,
    },
  };
  try {
    await updateWorkflowInputs(nextInputs);
    toast.success('Workflow input added');
    onSuccess(trimmedName);
  } catch (error) {
    console.error('Failed to add workflow input', error);
    toast.error('Failed to add workflow input');
    throw error;
  }
};

export const removeWorkflowInput = async (
  inputName: string,
  workflowInputs: Record<string, InputDef> | undefined,
  updateWorkflowInputs: ((inputs: Record<string, InputDef>) => Promise<void>) | undefined,
  onSuccess: (inputName: string) => void,
) => {
  if (!updateWorkflowInputs) {
    toast.error('Unable to edit workflow inputs');
    return;
  }
  if (!workflowInputs || !(inputName in workflowInputs)) {
    return;
  }
  const nextInputs = Object.fromEntries(Object.entries(workflowInputs).filter(([name]) => name !== inputName));
  try {
    await updateWorkflowInputs(nextInputs);
    toast.success('Workflow input removed');
    onSuccess(inputName);
  } catch (error) {
    console.error('Failed to remove workflow input', error);
    toast.error('Failed to remove workflow input');
    throw error;
  }
};

export const copyToClipboard = async (value: string | null | undefined, label: string) => {
  if (!value) {
    toast.error(`No ${label.toLowerCase()} available`);
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch (error) {
    console.error('Clipboard error', error);
    toast.error('Unable to copy');
  }
};

export const toggleTrigger = async (
  subscription: WorkflowNodeData['triggerMeta']['subscription'],
  nextEnabled: boolean,
  toggleHandler: ((id: number, enabled: boolean) => Promise<void>) | undefined,
) => {
  if (!toggleHandler || !subscription) {
    return;
  }
  try {
    await toggleHandler(subscription.subscription_id, nextEnabled);
    toast.success(`Trigger ${nextEnabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to toggle trigger', error);
    toast.error('Unable to update trigger');
    throw error;
  }
};

export const deleteTrigger = async (
  subscription: WorkflowNodeData['triggerMeta']['subscription'],
  draft: WorkflowNodeData['triggerMeta']['draft'],
  handlers: NonNullable<WorkflowNodeData['triggerMeta']['handlers']>,
) => {
  if (!subscription && draft) {
    handlers?.discardDraft?.(draft.id);
    toast.success('Trigger draft removed');
    return;
  }
  if (!handlers?.delete || !subscription) {
    return;
  }
  if (!confirm('Delete this trigger subscription?')) {
    return;
  }
  try {
    await handlers.delete(subscription.subscription_id);
    toast.success('Trigger removed');
  } catch (error) {
    console.error('Failed to delete trigger', error);
    toast.error('Unable to delete trigger');
    throw error;
  }
};

export const updateBindingMode = (
  bindingState: BindingState,
  inputName: string,
  mode: 'event' | 'literal',
): BindingState => {
  return {
    ...bindingState,
    [inputName]: {
      mode,
      value:
        mode === 'event'
          ? bindingState[inputName]?.mode === 'event'
            ? bindingState[inputName]?.value ?? `data.${inputName}`
            : `data.${inputName}`
          : bindingState[inputName]?.mode === 'literal'
            ? bindingState[inputName]?.value ?? ''
            : '',
    },
  };
};

export const updateBindingValue = (
  bindingState: BindingState,
  inputName: string,
  value: string,
): BindingState => {
  return {
    ...bindingState,
    [inputName]: {
      mode: bindingState[inputName]?.mode ?? 'event',
      value,
    },
  };
};

export const quickInsertBinding = (
  bindingState: BindingState,
  inputName: string,
  value: string,
): BindingState => {
  return {
    ...bindingState,
    [inputName]: {
      mode: 'event',
      value,
    },
  };
};

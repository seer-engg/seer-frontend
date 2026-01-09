import { useEffect, useMemo, useState } from 'react';
import type { InputDef } from '@/types/workflow-spec';
import type { WorkflowNodeData } from '../../../types';
import {
  BindingState,
  buildBindingsPayload,
  buildDefaultBindingState,
  deriveBindingStateFromSubscription,
} from '../../../triggers/utils';
import {
  copyToClipboard,
  createWorkflowInput,
  deleteTrigger,
  quickInsertBinding,
  removeWorkflowInput,
  toggleTrigger,
  updateBindingMode,
  updateBindingValue,
} from './handlers';

// Binding handlers extracted to reduce main hook size
const useBindingHandlers = (
  setBindingState: React.Dispatch<React.SetStateAction<BindingState>>,
) => {
  const handleBindingModeChange = (inputName: string, mode: 'event' | 'literal') => {
    setBindingState((prev) => updateBindingMode(prev, inputName, mode));
  };

  const handleBindingValueChange = (inputName: string, value: string) => {
    setBindingState((prev) => updateBindingValue(prev, inputName, value));
  };

  const bindingQuickInsert = (inputName: string, value: string) => {
    setBindingState((prev) => quickInsertBinding(prev, inputName, value));
  };

  return { handleBindingModeChange, handleBindingValueChange, bindingQuickInsert } as const;
};

// Workflow inputs editor extracted to reduce main hook size
const useWorkflowInputsEditor = (
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>,
  setBindingState: React.Dispatch<React.SetStateAction<BindingState>>,
) => {
  const { workflowInputs } = triggerMeta;

  const [showInputsEditor, setShowInputsEditor] = useState(false);
  const [isSavingWorkflowInput, setIsSavingWorkflowInput] = useState(false);
  const [inputDraft, setInputDraft] = useState<{
    name: string;
    type: InputDef['type'];
    description: string;
    required: boolean;
  }>({ name: '', type: 'string', description: '', required: true });

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);
  const hasInputs = workflowInputEntries.length > 0;
  const canManageInputs = Boolean(triggerMeta.handlers?.updateWorkflowInputs);

  useEffect(() => {
    if (workflowInputEntries.length === 0) {
      setShowInputsEditor(true);
    }
  }, [workflowInputEntries.length]);

  const handleCreateWorkflowInput = async () => {
    setIsSavingWorkflowInput(true);
    try {
      await createWorkflowInput(inputDraft, workflowInputs, triggerMeta.handlers?.updateWorkflowInputs, (trimmedName) => {
        setBindingState((prev) => ({
          ...prev,
          [trimmedName]: { mode: 'event', value: `data.${trimmedName}` },
        }));
        setInputDraft({ name: '', type: 'string', description: '', required: true });
      });
    } finally {
      setIsSavingWorkflowInput(false);
    }
  };

  const handleRemoveWorkflowInput = async (inputName: string) => {
    setIsSavingWorkflowInput(true);
    try {
      await removeWorkflowInput(inputName, workflowInputs, triggerMeta.handlers?.updateWorkflowInputs, (removedName) => {
        setBindingState((prev) => {
          if (!(removedName in prev)) {
            return prev;
          }
          const nextState = { ...prev };
          delete nextState[removedName];
          return nextState;
        });
      });
    } finally {
      setIsSavingWorkflowInput(false);
    }
  };

  return {
    showInputsEditor,
    setShowInputsEditor,
    isSavingWorkflowInput,
    setIsSavingWorkflowInput,
    inputDraft,
    setInputDraft,
    workflowInputEntries,
    hasInputs,
    canManageInputs,
    handleCreateWorkflowInput,
    handleRemoveWorkflowInput,
  } as const;
};

// Trigger actions extracted
const useTriggerActions = (
  isDraft: boolean,
  subscription: NonNullable<WorkflowNodeData['triggerMeta']>['subscription'],
  draft: NonNullable<WorkflowNodeData['triggerMeta']>['draft'],
  handlers: NonNullable<WorkflowNodeData['triggerMeta']>['handlers'],
) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async (nextEnabled: boolean) => {
    if (isDraft || !subscription) return;
    setIsToggling(true);
    try {
      await toggleTrigger(subscription, nextEnabled, handlers?.toggle);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrigger(subscription, draft, handlers);
    } finally {
      setIsDeleting(false);
    }
  };

  return { isToggling, setIsToggling, isDeleting, setIsDeleting, handleToggle, handleDelete } as const;
};

export const useBaseTrigger = (triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>) => {
  const { subscription, workflowInputs, handlers, draft } = triggerMeta;
  const isDraft = !subscription;

  const [bindingState, setBindingState] = useState<BindingState>(() =>
    subscription
      ? deriveBindingStateFromSubscription(workflowInputs, subscription)
      : draft?.initialBindings ?? buildDefaultBindingState(workflowInputs),
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subscription) {
      setBindingState(deriveBindingStateFromSubscription(workflowInputs, subscription));
    } else if (draft?.initialBindings) {
      setBindingState(draft.initialBindings);
    } else {
      setBindingState(buildDefaultBindingState(workflowInputs));
    }
  }, [subscription, workflowInputs, draft?.initialBindings]);

  const inputsEditor = useWorkflowInputsEditor(triggerMeta, setBindingState);
  const bindingHandlers = useBindingHandlers(setBindingState);
  const triggerActions = useTriggerActions(isDraft, subscription, draft, handlers);

  const handleCopy = (value: string | null | undefined, label: string) => {
    copyToClipboard(value, label);
  };

  return {
    bindingState,
    setBindingState,
    isExpanded,
    setIsExpanded,
    isSaving,
    setIsSaving,
    ...triggerActions,
    ...inputsEditor,
    isDraft,
    handleCopy,
    ...bindingHandlers,
    buildBindingsPayload,
  } as const;
};

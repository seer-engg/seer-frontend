import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Loader2, Trash2 } from 'lucide-react';

import type { WorkflowNodeData } from '../../types';
import type { InputDef } from '@/types/workflow-spec';
import {
  BindingState,
  buildBindingsPayload,
  buildDefaultBindingState,
  deriveBindingStateFromSubscription,
} from '../../triggers/utils';
import { INPUT_TYPE_OPTIONS } from './inputConstants';
import {
  createWorkflowInput,
  removeWorkflowInput,
  copyToClipboard,
  toggleTrigger,
  deleteTrigger,
  updateBindingMode,
  updateBindingValue,
  quickInsertBinding,
} from './handlers';

export interface BaseTriggerProps {
  triggerMeta: NonNullable<WorkflowNodeData['triggerMeta']>;
  selected?: boolean;
}

export interface QuickOption {
  label: string;
  path: string;
}

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
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInputsEditor, setShowInputsEditor] = useState(false);
  const [isSavingWorkflowInput, setIsSavingWorkflowInput] = useState(false);
  const [inputDraft, setInputDraft] = useState<{
    name: string;
    type: InputDef['type'];
    description: string;
    required: boolean;
  }>({
    name: '',
    type: 'string',
    description: '',
    required: true,
  });

  const workflowInputEntries = useMemo(() => Object.entries(workflowInputs ?? {}), [workflowInputs]);
  const hasInputs = workflowInputEntries.length > 0;
  const canManageInputs = Boolean(triggerMeta.handlers?.updateWorkflowInputs);

  useEffect(() => {
    if (subscription) {
      setBindingState(deriveBindingStateFromSubscription(workflowInputs, subscription));
    } else if (draft?.initialBindings) {
      setBindingState(draft.initialBindings);
    } else {
      setBindingState(buildDefaultBindingState(workflowInputs));
    }
  }, [subscription, workflowInputs, draft?.initialBindings]);

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

  const handleCopy = (value: string | null | undefined, label: string) => {
    copyToClipboard(value, label);
  };

  const handleToggle = async (nextEnabled: boolean) => {
    if (isDraft || !subscription) {
      return;
    }
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

  const handleBindingModeChange = (inputName: string, mode: 'event' | 'literal') => {
    setBindingState((prev) => updateBindingMode(prev, inputName, mode));
  };

  const handleBindingValueChange = (inputName: string, value: string) => {
    setBindingState((prev) => updateBindingValue(prev, inputName, value));
  };

  const bindingQuickInsert = (inputName: string, value: string) => {
    setBindingState((prev) => quickInsertBinding(prev, inputName, value));
  };

  return {
    bindingState,
    setBindingState,
    isExpanded,
    setIsExpanded,
    isSaving,
    setIsSaving,
    isToggling,
    setIsToggling,
    isDeleting,
    setIsDeleting,
    showInputsEditor,
    setShowInputsEditor,
    isSavingWorkflowInput,
    setIsSavingWorkflowInput,
    inputDraft,
    setInputDraft,
    workflowInputEntries,
    hasInputs,
    canManageInputs,
    isDraft,
    handleCreateWorkflowInput,
    handleRemoveWorkflowInput,
    handleCopy,
    handleToggle,
    handleDelete,
    handleBindingModeChange,
    handleBindingValueChange,
    bindingQuickInsert,
    buildBindingsPayload,
  };
};

export interface WorkflowInputManagerProps {
  canManageInputs: boolean;
  showInputsEditor: boolean;
  setShowInputsEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
  workflowInputEntries: Array<[string, InputDef]>;
  isSavingWorkflowInput: boolean;
  inputDraft: {
    name: string;
    type: InputDef['type'];
    description: string;
    required: boolean;
  };
  setInputDraft: React.Dispatch<
    React.SetStateAction<{
      name: string;
      type: InputDef['type'];
      description: string;
      required: boolean;
    }>
  >;
  handleCreateWorkflowInput: () => void;
  handleRemoveWorkflowInput: (inputName: string) => void;
}

export const WorkflowInputManager: React.FC<WorkflowInputManagerProps> = ({
  canManageInputs,
  showInputsEditor,
  setShowInputsEditor,
  workflowInputEntries,
  isSavingWorkflowInput,
  inputDraft,
  setInputDraft,
  handleCreateWorkflowInput,
  handleRemoveWorkflowInput,
}) => {
  if (!canManageInputs) {
    return null;
  }
  return (
    <div className="rounded-lg border border-dashed bg-muted/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Workflow inputs</p>
          <p className="text-xs text-muted-foreground">
            Add inputs for this trigger to populate before configuring bindings.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowInputsEditor((prev) => !prev)}
        >
          {showInputsEditor ? 'Hide form' : 'Add input'}
        </Button>
      </div>

      {workflowInputEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No workflow inputs yet. Add one to bind incoming event data.
        </p>
      ) : (
        <div className="space-y-2">
          {workflowInputEntries.map(([inputName, inputDef]) => (
            <div
              key={inputName}
              className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{inputName}</p>
                <p className="text-xs text-muted-foreground">
                  {inputDef.description || 'No description provided'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{inputDef.type}</Badge>
                {inputDef.required && <Badge variant="outline">Required</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveWorkflowInput(inputName)}
                  disabled={isSavingWorkflowInput}
                  title="Remove workflow input"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInputsEditor && (
        <div className="space-y-3 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Name</Label>
            <Input
              value={inputDraft.name}
              placeholder="customerEmail"
              onChange={(event) =>
                setInputDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Type</Label>
              <Select
                value={inputDraft.type}
                onValueChange={(value) =>
                  setInputDraft((prev) => ({
                    ...prev,
                    type: value as InputDef['type'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INPUT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Required</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={inputDraft.required}
                  onCheckedChange={(value) =>
                    setInputDraft((prev) => ({
                      ...prev,
                      required: value,
                    }))
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {inputDraft.required ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Description</Label>
            <Input
              value={inputDraft.description}
              placeholder="Shown in manual runs"
              onChange={(event) =>
                setInputDraft((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateWorkflowInput}
            disabled={isSavingWorkflowInput}
          >
            {isSavingWorkflowInput ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save input'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export interface BindingSectionProps {
  hasInputs: boolean;
  canManageInputs: boolean;
  workflowInputEntries: Array<[string, InputDef]>;
  bindingState: BindingState;
  handleBindingModeChange: (inputName: string, mode: 'event' | 'literal') => void;
  handleBindingValueChange: (inputName: string, value: string) => void;
  bindingQuickInsert: (inputName: string, value: string) => void;
  quickOptions?: QuickOption[];
}

export const BindingSection: React.FC<BindingSectionProps> = ({
  hasInputs,
  canManageInputs,
  workflowInputEntries,
  bindingState,
  handleBindingModeChange,
  handleBindingValueChange,
  bindingQuickInsert,
  quickOptions = [],
}) => {
  if (!hasInputs) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium">No workflow inputs defined</p>
        <p className="text-xs">
          {canManageInputs
            ? 'Add a workflow input above to bind trigger data.'
            : 'This trigger will start the workflow without input data.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {workflowInputEntries.map(([inputName, inputDef]) => {
        const config = bindingState[inputName] ?? { mode: 'event', value: `data.${inputName}` };
        const defaultEventPath = `data.${inputName}`;
        return (
          <div key={inputName} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{inputName}</p>
                {inputDef.description && (
                  <p className="text-xs text-muted-foreground">{inputDef.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{inputDef.type}</Badge>
                {inputDef.required && <Badge variant="outline">Required</Badge>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Binding mode</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={config.mode === 'event' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBindingModeChange(inputName, 'event')}
                  >
                    Event path
                  </Button>
                  <Button
                    type="button"
                    variant={config.mode === 'literal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBindingModeChange(inputName, 'literal')}
                  >
                    Literal value
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  {config.mode === 'event' ? 'Event path (relative to event.*)' : 'Literal value'}
                </Label>
                <Input
                  value={config.value}
                  placeholder={config.mode === 'event' ? defaultEventPath : '42'}
                  onChange={(event) => handleBindingValueChange(inputName, event.target.value)}
                />
                {config.mode === 'event' && quickOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    {quickOptions.map((option) => (
                      <Button
                        key={`${inputName}-${option.path}`}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => bindingQuickInsert(inputName, option.path)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

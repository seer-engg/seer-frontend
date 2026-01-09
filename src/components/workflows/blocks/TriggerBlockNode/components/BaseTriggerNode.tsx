import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Loader2, Trash2 } from 'lucide-react';

import type { InputDef } from '@/types/workflow-spec';
import { INPUT_TYPE_OPTIONS } from './inputConstants';
import type { BindingState } from '../../../triggers/utils';

export interface QuickOption {
  label: string;
  path: string;
}
// Note: Hook logic moved to components/useBaseTrigger.ts to satisfy
// react-refresh/only-export-components and reduce function lengths.

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
  if (!canManageInputs) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Workflow inputs</p>
          <p className="text-xs text-muted-foreground">
            Add inputs for this trigger to populate before configuring bindings.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowInputsEditor((p) => !p)}>
          {showInputsEditor ? 'Hide form' : 'Add input'}
        </Button>
      </div>

      {workflowInputEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No workflow inputs yet. Add one to bind incoming event data.</p>
      ) : (
        <WorkflowInputList
          entries={workflowInputEntries}
          isSaving={isSavingWorkflowInput}
          onRemove={handleRemoveWorkflowInput}
        />
      )}

      {showInputsEditor && (
        <WorkflowInputForm
          inputDraft={inputDraft}
          setInputDraft={setInputDraft}
          isSaving={isSavingWorkflowInput}
          onSave={handleCreateWorkflowInput}
        />
      )}
    </div>
  );
};

const WorkflowInputList: React.FC<{
  entries: Array<[string, InputDef]>;
  isSaving: boolean;
  onRemove: (inputName: string) => void;
}> = ({ entries, isSaving, onRemove }) => (
  <div className="space-y-2">
    {entries.map(([inputName, inputDef]) => (
      <div key={inputName} className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2">
        <div>
          <p className="text-sm font-medium">{inputName}</p>
          <p className="text-xs text-muted-foreground">{inputDef.description || 'No description provided'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary">{inputDef.type}</Badge>
          {inputDef.required && <Badge variant="outline">Required</Badge>}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(inputName)}
            disabled={isSaving}
            title="Remove workflow input"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ))}
  </div>
);

const WorkflowInputForm: React.FC<{
  inputDraft: {
    name: string;
    type: InputDef['type'];
    description: string;
    required: boolean;
  };
  setInputDraft: React.Dispatch<React.SetStateAction<{ name: string; type: InputDef['type']; description: string; required: boolean }>>;
  isSaving: boolean;
  onSave: () => void;
}> = ({ inputDraft, setInputDraft, isSaving, onSave }) => (
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
          <span className="text-xs text-muted-foreground">{inputDraft.required ? 'Required' : 'Optional'}</span>
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
    <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        'Save input'
      )}
    </Button>
  </div>
);

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
      {workflowInputEntries.map(([inputName, inputDef]) => (
        <BindingRow
          key={inputName}
          inputName={inputName}
          inputDef={inputDef}
          config={bindingState[inputName] ?? { mode: 'event', value: `data.${inputName}` }}
          onModeChange={handleBindingModeChange}
          onValueChange={handleBindingValueChange}
          onQuickInsert={bindingQuickInsert}
          quickOptions={quickOptions}
        />
      ))}
    </>
  );
};

const BindingRow: React.FC<{
  inputName: string;
  inputDef: InputDef;
  config: BindingState[string];
  onModeChange: (name: string, mode: 'event' | 'literal') => void;
  onValueChange: (name: string, value: string) => void;
  onQuickInsert: (name: string, value: string) => void;
  quickOptions: QuickOption[];
}> = ({ inputName, inputDef, config, onModeChange, onValueChange, onQuickInsert, quickOptions }) => {
  const defaultEventPath = `data.${inputName}`;
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{inputName}</p>
          {inputDef.description && <p className="text-xs text-muted-foreground">{inputDef.description}</p>}
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
              onClick={() => onModeChange(inputName, 'event')}
            >
              Event path
            </Button>
            <Button
              type="button"
              variant={config.mode === 'literal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange(inputName, 'literal')}
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
            onChange={(event) => onValueChange(inputName, event.target.value)}
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
                  onClick={() => onQuickInsert(inputName, option.path)}
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
};

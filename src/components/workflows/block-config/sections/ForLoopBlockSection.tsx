import { useRef, type Dispatch, type SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { AutocompleteContext } from '../hooks/useTemplateAutocomplete';
import { TemplateAutocompleteControls } from '../types';
import { VariableAutocompleteDropdown } from '../widgets/VariableAutocompleteDropdown';

interface ForLoopBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
  templateAutocomplete: TemplateAutocompleteControls;
}

export function ForLoopBlockSection({
  config,
  setConfig,
  templateAutocomplete,
}: ForLoopBlockSectionProps) {
  const arrayVariable = config.array_variable || config.array_var || 'items';
  const legacyLiteralItems = Array.isArray(config.array_literal) ? config.array_literal : [];

  const arrayVariableRef = useRef<HTMLInputElement>(null);

  const {
    autocompleteContext,
    checkForAutocomplete,
    closeAutocomplete,
    filteredVariables,
    handleKeyDown,
    insertVariable,
    selectedIndex,
    setAutocompleteContext,
    showAutocomplete,
  } = templateAutocomplete;

  const inputId = 'for-loop-array-variable';
  const dropdownVisible = showAutocomplete && autocompleteContext?.inputId === inputId;

  const persistArrayVariable = (value: string) => {
    setConfig(prev => {
      const next: Record<string, any> = { ...prev, array_variable: value, array_var: undefined };
      delete next.array_literal;
      delete next.array_mode;
      return next;
    });
  };

  const handleArrayVariableChange = (value: string, cursorPosition: number) => {
    persistArrayVariable(value);
    const context: AutocompleteContext = {
      inputId,
      ref: arrayVariableRef,
      value,
      onChange: persistArrayVariable,
    };
    checkForAutocomplete(value, cursorPosition, context);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor={inputId}>Array source variable</Label>
        <Input
          ref={arrayVariableRef}
          id={inputId}
          value={arrayVariable}
          onChange={e =>
            handleArrayVariableChange(
              e.target.value,
              e.target.selectionStart ?? e.target.value.length
            )
          }
          onFocus={() =>
            setAutocompleteContext({
              inputId,
              ref: arrayVariableRef,
              value: arrayVariable,
              onChange: persistArrayVariable,
            })
          }
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => closeAutocomplete(), 200);
          }}
          placeholder="e.g., {{blockAlias.output}}"
          className="font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Reference an array-producing output or alias using {'{{variable}}'} syntax.
        </p>
        <VariableAutocompleteDropdown
          visible={dropdownVisible}
          variables={filteredVariables}
          selectedIndex={selectedIndex}
          onSelect={insertVariable}
        />
      </div>

      {legacyLiteralItems.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Legacy manual lists ({legacyLiteralItems.length} item
          {legacyLiteralItems.length === 1 ? '' : 's'}) are read-only. Point this loop to a variable
          above to migrate.
        </div>
      )}

      <div>
        <Label htmlFor="item-var">Item variable name</Label>
        <Input
          id="item-var"
          value={config.item_var || 'item'}
          onChange={e => setConfig(prev => ({ ...prev, item_var: e.target.value }))}
          placeholder="e.g., email"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Downstream blocks can reference <code>{`{{${config.item_var || 'item'}}}`}</code> or the
          block alias.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Loop routing</p>
        <p className="mt-1">
          Use the <span className="font-medium text-foreground">Loop</span> handle to connect blocks
          that should run for every item. Once the array is exhausted, the workflow continues through
          the <span className="font-medium text-foreground">Exit</span> handle exactly once.
        </p>
      </div>
    </div>
  );
}


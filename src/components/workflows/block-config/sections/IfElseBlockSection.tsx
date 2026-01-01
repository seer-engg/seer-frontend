import { useRef, type Dispatch, type SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { AutocompleteContext } from '../hooks/useTemplateAutocomplete';
import { TemplateAutocompleteControls } from '../types';
import { VariableAutocompleteDropdown } from '../widgets/VariableAutocompleteDropdown';

interface IfElseBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
  templateAutocomplete: TemplateAutocompleteControls;
}

export function IfElseBlockSection({
  config,
  setConfig,
  templateAutocomplete,
}: IfElseBlockSectionProps) {
  const conditionRef = useRef<HTMLInputElement>(null);
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

  const inputId = 'if-else-condition';
  const dropdownVisible = showAutocomplete && autocompleteContext?.inputId === inputId;
  const conditionValue = config.condition || '';

  const persistCondition = (value: string) =>
    setConfig(prev => ({
      ...prev,
      condition: value,
    }));

  const handleConditionChange = (value: string, cursorPosition: number) => {
    persistCondition(value);
    const context: AutocompleteContext = {
      inputId,
      ref: conditionRef,
      value,
      onChange: persistCondition,
    };
    checkForAutocomplete(value, cursorPosition, context);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor={inputId}>Condition Expression</Label>
        <Input
          ref={conditionRef}
          id={inputId}
          value={conditionValue}
          onChange={e =>
            handleConditionChange(
              e.target.value,
              e.target.selectionStart ?? e.target.value.length
            )
          }
          onFocus={() =>
            setAutocompleteContext({
              inputId,
              ref: conditionRef,
              value: conditionValue,
              onChange: persistCondition,
            })
          }
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => closeAutocomplete(), 200);
          }}
          placeholder="e.g., {{alias.output}} > 0"
          className="font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use {'{{variable}}'} expressions referencing upstream outputs or workflow inputs.
        </p>
        <VariableAutocompleteDropdown
          visible={dropdownVisible}
          variables={filteredVariables}
          selectedIndex={selectedIndex}
          onSelect={insertVariable}
        />
      </div>
    </div>
  );
}


import type { Dispatch, RefObject, SetStateAction } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { StructuredOutputEditor } from '@/components/workflows/StructuredOutputEditor';

import { AutocompleteContext } from '../hooks/useTemplateAutocomplete';
import { TemplateAutocompleteControls } from '../types';
import { VariableAutocompleteDropdown } from '../widgets/VariableAutocompleteDropdown';

interface LlmBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
  useStructuredOutput: boolean;
  setUseStructuredOutput: (value: boolean) => void;
  structuredOutputSchema?: Record<string, any>;
  onStructuredOutputSchemaChange: (schema?: Record<string, any>) => void;
  systemPromptRef: RefObject<HTMLTextAreaElement>;
  userPromptRef: RefObject<HTMLTextAreaElement>;
  templateAutocomplete: TemplateAutocompleteControls;
}

const MODEL_OPTIONS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

export function LlmBlockSection({
  config,
  setConfig,
  useStructuredOutput,
  setUseStructuredOutput,
  structuredOutputSchema,
  onStructuredOutputSchemaChange,
  systemPromptRef,
  userPromptRef,
  templateAutocomplete,
}: LlmBlockSectionProps) {
  const outputSchema = structuredOutputSchema ?? config.output_schema;
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

  const handlePromptChange = (
    field: 'system_prompt' | 'user_prompt',
    value: string,
    ref: RefObject<HTMLTextAreaElement>,
    cursorPosition: number
  ) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    const context: AutocompleteContext = {
      inputId: field,
      ref,
      value,
      onChange: newValue => setConfig(prev => ({ ...prev, [field]: newValue })),
    };
    checkForAutocomplete(value, cursorPosition, context);
  };

  const promptDropdownVisible = (field: 'system_prompt' | 'user_prompt') =>
    showAutocomplete && autocompleteContext?.inputId === field;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor="system-prompt">System Prompt</Label>
        <Textarea
          ref={systemPromptRef}
          id="system-prompt"
          value={config.system_prompt || ''}
          onChange={e =>
            handlePromptChange(
              'system_prompt',
              e.target.value,
              systemPromptRef,
              e.target.selectionStart ?? e.target.value.length
            )
          }
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setAutocompleteContext({
              inputId: 'system_prompt',
              ref: systemPromptRef,
              value: config.system_prompt || '',
              onChange: newValue => setConfig(prev => ({ ...prev, system_prompt: newValue })),
            });
          }}
          onBlur={() => {
            setTimeout(() => closeAutocomplete(), 200);
          }}
          placeholder="You are a helpful assistant..."
          rows={6}
          className="max-h-[200px] overflow-y-auto"
        />
        <VariableAutocompleteDropdown
          visible={promptDropdownVisible('system_prompt')}
          variables={filteredVariables}
          selectedIndex={selectedIndex}
          onSelect={insertVariable}
        />
      </div>

      <div className="relative">
        <Label htmlFor="user-prompt">
          User Prompt <span className="text-destructive">*</span>
        </Label>
        <Textarea
          ref={userPromptRef}
          id="user-prompt"
          value={config.user_prompt || ''}
          onChange={e =>
            handlePromptChange(
              'user_prompt',
              e.target.value,
              userPromptRef,
              e.target.selectionStart ?? e.target.value.length
            )
          }
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setAutocompleteContext({
              inputId: 'user_prompt',
              ref: userPromptRef,
              value: config.user_prompt || '',
              onChange: newValue => setConfig(prev => ({ ...prev, user_prompt: newValue })),
            });
          }}
          onBlur={() => {
            setTimeout(() => closeAutocomplete(), 200);
          }}
          placeholder="Enter your message or question..."
          rows={6}
          className="max-h-[200px] overflow-y-auto"
          required
        />
        <VariableAutocompleteDropdown
          visible={promptDropdownVisible('user_prompt')}
          variables={filteredVariables}
          selectedIndex={selectedIndex}
          onSelect={insertVariable}
        />
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        <Select
          value={config.model || MODEL_OPTIONS[0].value}
          onValueChange={value => setConfig(prev => ({ ...prev, model: value }))}
        >
          <SelectTrigger id="model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="temperature">Temperature</Label>
        <Input
          id="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature ?? 0.2}
          onChange={e => {
            const value = parseFloat(e.target.value);
            setConfig(prev => ({ ...prev, temperature: value }));
          }}
        />
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t">
        <Checkbox
          id="structured-output"
          checked={useStructuredOutput}
          onCheckedChange={checked => {
            const isChecked = checked === true;
            setUseStructuredOutput(isChecked);
            if (!isChecked) {
              onStructuredOutputSchemaChange(undefined);
            } else if (!outputSchema) {
              onStructuredOutputSchemaChange({
                type: 'object',
                properties: {},
              });
            }
          }}
        />
        <Label htmlFor="structured-output" className="text-sm font-normal cursor-pointer">
          Structured Output (JSON Schema)
        </Label>
      </div>

      {useStructuredOutput && (
        <StructuredOutputEditor
          value={outputSchema}
          onChange={schema => onStructuredOutputSchemaChange(schema)}
        />
      )}
    </div>
  );
}


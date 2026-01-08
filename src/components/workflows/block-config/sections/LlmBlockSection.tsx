import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { StructuredOutputEditor } from '@/components/workflows/StructuredOutputEditor';

import { LlmBlockConfig, BlockSectionProps } from '../types';
import { AutocompleteTextarea } from '../widgets/AutocompleteTextarea';
import { FormField } from '../widgets/FormField';

interface LlmBlockSectionProps extends Omit<BlockSectionProps<LlmBlockConfig>, 'validationErrors'> {
  useStructuredOutput: boolean;
  setUseStructuredOutput: (value: boolean) => void;
  structuredOutputSchema?: Record<string, unknown>;
  onStructuredOutputSchemaChange: (schema?: Record<string, unknown>) => void;
}

const MODEL_OPTIONS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { value: 'gpt-5', label: 'GPT-5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

function StructuredOutputToggle({
  useStructuredOutput,
  setUseStructuredOutput,
  onStructuredOutputSchemaChange,
  outputSchema,
}: {
  useStructuredOutput: boolean;
  setUseStructuredOutput: (value: boolean) => void;
  onStructuredOutputSchemaChange: (schema?: Record<string, unknown>) => void;
  outputSchema?: Record<string, unknown>;
}) {
  return (
    <>
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
    </>
  );
}

export function LlmBlockSection({
  config,
  setConfig,
  useStructuredOutput,
  setUseStructuredOutput,
  structuredOutputSchema,
  onStructuredOutputSchemaChange,
  templateAutocomplete,
}: LlmBlockSectionProps) {
  const outputSchema = structuredOutputSchema ?? config.output_schema;

  return (
    <div className="space-y-2">
      <FormField
        label="System Prompt"
        description="Instructions that set the AI's behavior and context"
        htmlFor="system-prompt"
      >
        <AutocompleteTextarea
          id="system-prompt"
          value={config.system_prompt || ''}
          onChange={value => setConfig(prev => ({ ...prev, system_prompt: value }))}
          placeholder="You are a helpful assistant..."
          templateAutocomplete={templateAutocomplete}
          rows={4}
          className="max-h-[120px] overflow-y-auto"
        />
      </FormField>

      <FormField
        label="User Prompt"
        description="The main prompt or question for the LLM"
        required
        htmlFor="user-prompt"
      >
        <AutocompleteTextarea
          id="user-prompt"
          value={config.user_prompt || ''}
          onChange={value => setConfig(prev => ({ ...prev, user_prompt: value }))}
          placeholder="Enter your message or question..."
          templateAutocomplete={templateAutocomplete}
          rows={4}
          className="max-h-[120px] overflow-y-auto"
        />
      </FormField>

      <FormField label="Model" description="Choose the AI model to use" defaultValue={MODEL_OPTIONS[0].label} htmlFor="model">
        <Select value={config.model || MODEL_OPTIONS[0].value} onValueChange={value => setConfig(prev => ({ ...prev, model: value }))}>
          <SelectTrigger id="model"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Temperature" description="Controls randomness (0=deterministic, 2=very creative)" defaultValue={0.2} htmlFor="temperature">
        <Input
          id="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature ?? 0.2}
          onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
        />
      </FormField>

      <StructuredOutputToggle
        useStructuredOutput={useStructuredOutput}
        setUseStructuredOutput={setUseStructuredOutput}
        onStructuredOutputSchemaChange={onStructuredOutputSchemaChange}
        outputSchema={outputSchema}
      />
    </div>
  );
}


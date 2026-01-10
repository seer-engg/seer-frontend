import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { StructuredOutputEditor } from '@/components/workflows/StructuredOutputEditor';

import { LlmBlockConfig, BlockSectionProps } from '../types';
import { FormField } from '../widgets/FormField';
import { DynamicFormField } from '../widgets/DynamicFormField';

interface LlmBlockSectionProps extends BlockSectionProps<LlmBlockConfig> {
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
  validationErrors = {},
}: LlmBlockSectionProps) {
  const outputSchema = structuredOutputSchema ?? config.output_schema;

  return (
    <div className="space-y-2">
      <DynamicFormField
        name="system_prompt"
        label="System Prompt"
        description="Instructions that set the AI's behavior and context"
        value={config.system_prompt || ''}
        onChange={value => setConfig(prev => ({ ...prev, system_prompt: value as string }))}
        def={{ type: 'string', multiline: true }}
        templateAutocomplete={templateAutocomplete}
        rows={4}
        className="max-h-[120px] overflow-y-auto"
        error={validationErrors['system_prompt']}
      />

      <DynamicFormField
        name="user_prompt"
        label="User Prompt"
        description="The main prompt or question for the LLM"
        required
        value={config.user_prompt || ''}
        onChange={value => setConfig(prev => ({ ...prev, user_prompt: value as string }))}
        def={{ type: 'string', multiline: true }}
        templateAutocomplete={templateAutocomplete}
        rows={4}
        className="max-h-[120px] overflow-y-auto"
        error={validationErrors['user_prompt']}
      />

      <DynamicFormField
        name="model"
        label="Model"
        description="Choose the AI model to use"
        defaultValue={MODEL_OPTIONS[0].label}
        value={config.model || MODEL_OPTIONS[0].value}
        onChange={value => setConfig(prev => ({ ...prev, model: String(value) }))}
        def={{ type: 'string', enum: MODEL_OPTIONS.map(o => o.value) }}
        templateAutocomplete={templateAutocomplete}
        error={validationErrors['model']}
      />

      <DynamicFormField
        name="temperature"
        label="Temperature"
        description="Controls randomness (0=deterministic, 2=very creative)"
        defaultValue={0.2}
        value={config.temperature ?? 0.2}
        onChange={value => setConfig(prev => ({ ...prev, temperature: typeof value === 'string' ? parseFloat(value) : (value as number) }))}
        def={{ type: 'number', minimum: 0, maximum: 2 }}
        templateAutocomplete={templateAutocomplete}
        error={validationErrors['temperature']}
      />

      <StructuredOutputToggle
        useStructuredOutput={useStructuredOutput}
        setUseStructuredOutput={setUseStructuredOutput}
        onStructuredOutputSchemaChange={onStructuredOutputSchemaChange}
        outputSchema={outputSchema}
      />
    </div>
  );
}


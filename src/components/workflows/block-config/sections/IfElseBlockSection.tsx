import { IfElseBlockConfig, BlockSectionProps } from '../types';
import { AutocompleteInput } from '../widgets/AutocompleteInput';
import { FormField } from '../widgets/FormField';

type IfElseBlockSectionProps = BlockSectionProps<IfElseBlockConfig>;

export function IfElseBlockSection({
  config,
  setConfig,
  templateAutocomplete,
}: IfElseBlockSectionProps) {

  return (
    <div className="space-y-4">
      <FormField
        label="Condition Expression"
        description="Boolean expression using {{variable}} syntax. Use {{variable}} expressions referencing upstream outputs or workflow inputs."
        htmlFor="if-else-condition"
      >
        <AutocompleteInput
          id="if-else-condition"
          value={config.condition || ''}
          onChange={value => setConfig(prev => ({ ...prev, condition: value }))}
          placeholder="e.g., {{alias.output}} > 0"
          templateAutocomplete={templateAutocomplete}
          className="font-mono"
        />
      </FormField>
    </div>
  );
}


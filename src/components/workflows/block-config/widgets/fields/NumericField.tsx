import { cn } from '@/lib/utils';
import { AutocompleteInput } from '../AutocompleteInput';
import { parseNumericInput } from '../../utils/param-utils';
import type { NumericFieldProps } from './types';

export function NumericField({
  id,
  value,
  onChange,
  placeholder,
  templateAutocomplete,
  showError,
  type,
}: NumericFieldProps) {
  return (
    <AutocompleteInput
      id={id}
      value={String(value ?? '')}
      onChange={v => onChange(parseNumericInput(v, type))}
      placeholder={placeholder}
      templateAutocomplete={templateAutocomplete}
      className={cn('text-xs', showError && 'border-destructive')}
    />
  );
}

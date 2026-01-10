import { cn } from '@/lib/utils';
import { AutocompleteInput } from '../AutocompleteInput';
import { AutocompleteTextarea } from '../AutocompleteTextarea';
import type { TextFieldProps } from './types';

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  templateAutocomplete,
  showError,
  multiline,
  rows = 3,
}: TextFieldProps) {
  if (multiline) {
    return (
      <AutocompleteTextarea
        id={id}
        value={String(value ?? '')}
        onChange={onChange}
        placeholder={placeholder}
        templateAutocomplete={templateAutocomplete}
        rows={rows}
        className={cn('max-h-[120px] overflow-y-auto', showError && 'border-destructive')}
      />
    );
  }

  return (
    <AutocompleteInput
      id={id}
      value={String(value ?? '')}
      onChange={onChange}
      placeholder={placeholder}
      templateAutocomplete={templateAutocomplete}
      className={cn('text-xs', showError && 'border-destructive')}
    />
  );
}

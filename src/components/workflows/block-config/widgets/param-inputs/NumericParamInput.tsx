import { AutocompleteInput } from '../AutocompleteInput';
import { parseNumericInput } from '../../utils/param-utils';
import type { TemplateAutocompleteControls } from '../../types';

export interface NumericParamInputProps {
  paramName: string;
  value: unknown;
  onChange: (value: number | string) => void;
  paramType: 'integer' | 'number';
  templateAutocomplete: TemplateAutocompleteControls;
  placeholder?: string;
  title?: string;
}

export function NumericParamInput({
  paramName,
  value,
  onChange,
  paramType,
  templateAutocomplete,
  placeholder,
  title,
}: NumericParamInputProps) {
  const inputId = `param-${paramName}`;

  return (
    <AutocompleteInput
      id={inputId}
      value={String(value ?? '')}
      onChange={v => onChange(parseNumericInput(v, paramType))}
      placeholder={placeholder}
      templateAutocomplete={templateAutocomplete}
      className="text-xs"
      title={title}
    />
  );
}

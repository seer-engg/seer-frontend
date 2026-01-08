import { AutocompleteInput } from '../AutocompleteInput';
import type { TemplateAutocompleteControls } from '../../types';

export interface TextParamInputProps {
  paramName: string;
  value: unknown;
  onChange: (value: string) => void;
  templateAutocomplete: TemplateAutocompleteControls;
  placeholder?: string;
  title?: string;
}

export function TextParamInput({
  paramName,
  value,
  onChange,
  templateAutocomplete,
  placeholder,
  title,
}: TextParamInputProps) {
  const inputId = `param-${paramName}`;

  return (
    <AutocompleteInput
      id={inputId}
      value={String(value ?? '')}
      onChange={onChange}
      placeholder={placeholder}
      templateAutocomplete={templateAutocomplete}
      className="text-xs"
      title={title}
    />
  );
}

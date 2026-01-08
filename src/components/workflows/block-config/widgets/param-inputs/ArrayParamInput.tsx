import { AutocompleteTextarea } from '../AutocompleteTextarea';
import { safeJSONParse, safeJSONStringify } from '../../utils/param-utils';
import type { TemplateAutocompleteControls } from '../../types';

export interface ArrayParamInputProps {
  paramName: string;
  value: unknown;
  onChange: (value: unknown) => void;
  templateAutocomplete: TemplateAutocompleteControls;
  placeholder?: string;
  title?: string;
}

export function ArrayParamInput({
  paramName,
  value,
  onChange,
  templateAutocomplete,
  placeholder,
  title,
}: ArrayParamInputProps) {
  const inputId = `param-${paramName}`;
  const stringValue = safeJSONStringify(value);

  const handleChange = (newValue: string) => {
    // Try to parse as JSON, otherwise keep as string
    const parsed = safeJSONParse(newValue);
    onChange(parsed);
  };

  return (
    <AutocompleteTextarea
      id={inputId}
      value={stringValue}
      onChange={handleChange}
      placeholder={placeholder || '[]'}
      templateAutocomplete={templateAutocomplete}
      rows={3}
      className="text-xs font-mono"
      title={title}
    />
  );
}

import * as React from 'react';
import { FormField } from './FormField';
import type { TemplateAutocompleteControls, ResourcePickerConfig } from '../types';
import {
  ResourcePickerField,
  EnumSelectField,
  BooleanField,
  NumericField,
  JsonField,
  TextField,
} from './fields';

export type DynamicFieldDef = {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  multiline?: boolean;
  [key: string]: unknown;
};

export interface DynamicFormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
  def?: DynamicFieldDef;
  templateAutocomplete: TemplateAutocompleteControls;
  provider?: string;
  dependsOnValues?: Record<string, string>;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
  onResourceLabelChange?: (fieldName: string, label?: string) => void;
}

export function DynamicFormField(props: DynamicFormFieldProps) {
  const {
    name,
    label,
    description,
    required,
    defaultValue,
    value,
    onChange,
    def = {},
    templateAutocomplete,
    provider,
    dependsOnValues,
    placeholder,
    rows = 3,
    className,
    error,
    onResourceLabelChange,
  } = props;

  const fieldLabel = label ?? name;
  const type = typeof def.type === 'string' ? (def.type as string) : 'string';
  const enumOptions = Array.isArray(def.enum) ? def.enum.map(String) : undefined;
  const resourcePicker = def['x-resource-picker'] as ResourcePickerConfig | undefined;
  const htmlFor = `field-${name}`;
  const showError = Boolean(error);

  const baseProps = { id: htmlFor, placeholder, showError, templateAutocomplete };

  const renderField = () => {
    if (resourcePicker) {
      return (
        <ResourcePickerField
          {...baseProps}
          value={value}
          onChange={onChange}
          config={resourcePicker}
          provider={provider}
          dependsOnValues={dependsOnValues}
          fieldLabel={fieldLabel}
          fieldName={name}
          onResourceLabelChange={onResourceLabelChange}
          type={type}
        />
      );
    }

    if (enumOptions?.length) {
      return <EnumSelectField {...baseProps} value={value} onChange={onChange as (v: string) => void} enumOptions={enumOptions} />;
    }

    if (type === 'boolean') {
      return <BooleanField {...baseProps} value={value} onChange={onChange as (v: boolean) => void} />;
    }

    if (type === 'integer' || type === 'number') {
      return <NumericField {...baseProps} value={value} onChange={onChange} type={type} />;
    }

    if (type === 'array' || type === 'object') {
      return <JsonField {...baseProps} value={value} onChange={onChange} type={type} rows={rows} />;
    }

    return <TextField {...baseProps} value={value} onChange={onChange as (v: string) => void} multiline={def.multiline === true} rows={rows} />;
  };

  return (
    <FormField
      label={fieldLabel}
      description={description || (def.description as string | undefined)}
      defaultValue={defaultValue ?? def.default}
      required={required}
      htmlFor={htmlFor}
      inputClassName={className}
    >
      {renderField()}
      {showError && <p className="text-xs text-destructive mt-1">{error}</p>}
    </FormField>
  );
}

import * as React from 'react';
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { FormField } from './FormField';
import { AutocompleteInput } from './AutocompleteInput';
import { AutocompleteTextarea } from './AutocompleteTextarea';
import { ResourcePicker } from '@/components/workflows/dialogs/ResourcePicker';
import type { TemplateAutocompleteControls } from '../types';
import type { ResourcePickerConfig } from '../types';

import { parseNumericInput, safeJSONParse, safeJSONStringify } from '../utils/param-utils';

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

  // Field definition (JSON-schema-like, may include x-resource-picker)
  def?: DynamicFieldDef;

  // UI/behavior controls
  templateAutocomplete: TemplateAutocompleteControls;
  provider?: string; // For resource picker
  dependsOnValues?: Record<string, string>;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
  onResourceLabelChange?: (fieldName: string, label?: string) => void;
}

export function DynamicFormField({
  name,
  label,
  description,
  required,
  defaultValue,
  value,
  onChange,
  def,
  templateAutocomplete,
  provider,
  dependsOnValues,
  placeholder,
  rows = 3,
  className,
  error,
  onResourceLabelChange,
}: DynamicFormFieldProps) {
  const fieldLabel = label ?? name;
  const fieldDef = def ?? {};
  const type = typeof fieldDef.type === 'string' ? (fieldDef.type as string) : 'string';
  const enumOptions = Array.isArray(fieldDef.enum) ? fieldDef.enum.map(String) : undefined;
  const resourcePicker = fieldDef['x-resource-picker'] as ResourcePickerConfig | undefined;
  const htmlFor = `field-${name}`;

  const showError = Boolean(error);

  const inputEl = useMemo(() => {
    // Resource picker
    if (resourcePicker) {
      const current = value != null ? String(value) : undefined;
      const handleChange = (v: string, displayName?: string) => {
        const parsed = type === 'integer' ? (() => {
          const n = parseInt(v, 10);
          return Number.isNaN(n) ? v : n;
        })() : v;
        onChange(parsed);
        // Resource label bookkeeping is handled by section if needed
        if (onResourceLabelChange) {
          onResourceLabelChange(name, displayName);
        }
      };

      return (
        <div className="space-y-1">
          <ResourcePicker
            config={resourcePicker}
            provider={provider}
            value={current}
            onChange={handleChange}
            placeholder={placeholder || `Select ${fieldLabel}...`}
            dependsOnValues={dependsOnValues}
            className="text-xs"
          />
          {provider === 'supabase' && name === 'integration_resource_id' && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Connect Supabase Mgmt, then use "Bind project" to select a project.
            </p>
          )}
        </div>
      );
    }

    // Enum select
    if (enumOptions && enumOptions.length > 0) {
      return (
        <Select value={String(value ?? '')} onValueChange={onChange as (v: string) => void}>
          <SelectTrigger id={htmlFor} className={cn('text-xs', showError && 'border-destructive')}>
            <SelectValue placeholder={placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {enumOptions.map(opt => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Booleans
    if (type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={htmlFor}
            checked={Boolean(value)}
            onCheckedChange={checked => onChange(checked === true)}
          />
        </div>
      );
    }

    // Numbers
    if (type === 'integer' || type === 'number') {
      return (
        <AutocompleteInput
          id={htmlFor}
          value={String(value ?? '')}
          onChange={v => onChange(parseNumericInput(v, type))}
          placeholder={placeholder}
          templateAutocomplete={templateAutocomplete}
          className={cn('text-xs', showError && 'border-destructive')}
        />
      );
    }

    // Array
    if (type === 'array') {
      const stringValue = safeJSONStringify(value);
      return (
        <AutocompleteTextarea
          id={htmlFor}
          value={stringValue}
          onChange={v => onChange(safeJSONParse(v))}
          placeholder={placeholder || '[]'}
          templateAutocomplete={templateAutocomplete}
          rows={rows}
          className={cn('text-xs font-mono', showError && 'border-destructive')}
        />
      );
    }

    // Object
    if (type === 'object') {
      const stringValue = safeJSONStringify(value);
      return (
        <AutocompleteTextarea
          id={htmlFor}
          value={stringValue}
          onChange={v => onChange(safeJSONParse(v))}
          placeholder={placeholder || '{}'}
          templateAutocomplete={templateAutocomplete}
          rows={rows}
          className={cn('text-xs font-mono', showError && 'border-destructive')}
        />
      );
    }

    // Default: string/text
    const isMultiline = fieldDef?.multiline === true;
    if (isMultiline) {
      return (
        <AutocompleteTextarea
          id={htmlFor}
          value={String(value ?? '')}
          onChange={onChange as (v: string) => void}
          placeholder={placeholder}
          templateAutocomplete={templateAutocomplete}
          rows={rows}
          className={cn('max-h-[120px] overflow-y-auto', showError && 'border-destructive')}
        />
      );
    }

    return (
      <AutocompleteInput
        id={htmlFor}
        value={String(value ?? '')}
        onChange={onChange as (v: string) => void}
        placeholder={placeholder}
        templateAutocomplete={templateAutocomplete}
        className={cn('text-xs', showError && 'border-destructive')}
      />
    );
  }, [resourcePicker, provider, value, placeholder, enumOptions, fieldDef, name, onChange, templateAutocomplete, type, rows, fieldLabel, showError, htmlFor]);

  return (
    <FormField
      label={fieldLabel}
      description={description || (fieldDef?.description as string | undefined)}
      defaultValue={defaultValue ?? fieldDef?.default}
      required={required}
      htmlFor={htmlFor}
      inputClassName={className}
    >
      {inputEl}
      {showError && <p className="text-xs text-destructive mt-1">{error}</p>}
    </FormField>
  );
}

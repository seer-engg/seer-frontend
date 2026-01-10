import type { TemplateAutocompleteControls, ResourcePickerConfig } from '../../types';

/**
 * Base props shared by all field renderers
 */
export interface BaseFieldProps {
  /** Field ID for htmlFor */
  id: string;
  /** Current field value */
  value: unknown;
  /** Change handler */
  onChange: (value: unknown) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show error styling */
  showError: boolean;
  /** Template autocomplete controls */
  templateAutocomplete: TemplateAutocompleteControls;
}

/**
 * Props for ResourcePickerField component
 */
export interface ResourcePickerFieldProps extends Omit<BaseFieldProps, 'value' | 'onChange'> {
  value: unknown;
  onChange: (value: unknown) => void;
  config: ResourcePickerConfig;
  provider?: string;
  dependsOnValues?: Record<string, string>;
  fieldLabel: string;
  fieldName: string;
  onResourceLabelChange?: (fieldName: string, label?: string) => void;
  type: string;
}

/**
 * Props for EnumSelectField component
 */
export interface EnumSelectFieldProps extends Omit<BaseFieldProps, 'value' | 'onChange'> {
  value: unknown;
  onChange: (value: string) => void;
  enumOptions: string[];
}

/**
 * Props for BooleanField component
 */
export interface BooleanFieldProps extends Omit<BaseFieldProps, 'value' | 'onChange'> {
  value: unknown;
  onChange: (value: boolean) => void;
}

/**
 * Props for NumericField component
 */
export interface NumericFieldProps extends BaseFieldProps {
  type: 'integer' | 'number';
}

/**
 * Props for JsonField component
 */
export interface JsonFieldProps extends BaseFieldProps {
  type: 'array' | 'object';
  rows?: number;
}

/**
 * Props for TextField component
 */
export interface TextFieldProps extends Omit<BaseFieldProps, 'value' | 'onChange'> {
  value: unknown;
  onChange: (value: string) => void;
  multiline: boolean;
  rows?: number;
}

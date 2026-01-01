import { useTemplateAutocomplete } from './hooks/useTemplateAutocomplete';

export interface ResourcePickerConfig {
  resource_type: string;
  display_field?: string;
  value_field?: string;
  search_enabled?: boolean;
  hierarchy?: boolean;
  filter?: Record<string, any>;
  depends_on?: string;
}

export interface ToolMetadata {
  name: string;
  description: string;
  output_schema?: Record<string, any> | null;
  parameters?: {
    properties?: Record<string, any>;
    required?: string[];
  };
}

export type TemplateAutocompleteControls = ReturnType<typeof useTemplateAutocomplete>;


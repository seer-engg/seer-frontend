import { useTemplateAutocomplete } from './hooks/useTemplateAutocomplete';

export interface ResourcePickerConfig {
  resource_type: string;
  display_field?: string;
  value_field?: string;
  search_enabled?: boolean;
  hierarchy?: boolean;
  filter?: Record<string, unknown>;
  depends_on?: string;
  endpoint?: string;
}

export interface ToolMetadata {
  name: string;
  description: string;
  provider?: string | null;
  integration_type?: string | null;
  output_schema?: Record<string, unknown> | null;
  parameters?: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export type TemplateAutocompleteControls = ReturnType<typeof useTemplateAutocomplete>;


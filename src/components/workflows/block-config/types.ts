import type { Dispatch, SetStateAction } from 'react';
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

/**
 * Base interface for all block configurations
 */
export interface BaseBlockConfig {
  [key: string]: unknown;
}

/**
 * LLM Block Configuration
 */
export interface LlmBlockConfig extends BaseBlockConfig {
  model?: string;
  system_prompt?: string;
  user_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  structured_output?: Record<string, unknown>;
  response_format?: {
    type?: string;
    json_schema?: {
      name?: string;
      schema?: Record<string, unknown>;
      strict?: boolean;
    };
  };
}

/**
 * For Loop Block Configuration
 */
export interface ForLoopBlockConfig extends BaseBlockConfig {
  array_variable?: string;
  array_var?: string; // Legacy support
  item_var?: string;
  item_variable?: string;
  index_var?: string;
  // Legacy fields (read-only)
  array_literal?: unknown[];
  array_mode?: string;
}

/**
 * If/Else Block Configuration
 */
export interface IfElseBlockConfig extends BaseBlockConfig {
  condition?: string;
  condition_type?: 'expression' | 'comparison';
}

/**
 * Tool Block Configuration
 */
export interface ToolBlockConfig extends BaseBlockConfig {
  tool_name?: string;
  toolName?: string; // Legacy support
  connection_id?: string;
  provider?: string;
  arguments?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/**
 * Code Block Configuration
 */
export interface CodeBlockConfig extends BaseBlockConfig {
  code?: string;
  language?: 'python' | 'javascript' | 'typescript';
}

/**
 * Input Block Configuration
 */
export interface InputBlockConfig extends BaseBlockConfig {
  fields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'checkbox';
    required?: boolean;
    placeholder?: string;
    options?: string[];
    default_value?: string | number | boolean;
  }>;
}

/**
 * Union type for all block configurations
 */
export type BlockConfig =
  | LlmBlockConfig
  | ForLoopBlockConfig
  | IfElseBlockConfig
  | ToolBlockConfig
  | CodeBlockConfig
  | InputBlockConfig;

/**
 * Props interface for block section components
 */
export interface BlockSectionProps<T extends BaseBlockConfig> {
  config: T;
  setConfig: Dispatch<SetStateAction<T>>;
  templateAutocomplete: TemplateAutocompleteControls;
  validationErrors?: Record<string, string>;
}


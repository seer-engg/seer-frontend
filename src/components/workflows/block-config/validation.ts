import { ParameterSchema } from './SchemaFormField';
import { JsonValue } from '@/types/workflow-spec';
import {
  LlmBlockConfig,
  ToolBlockConfig,
  IfElseBlockConfig,
  ForLoopBlockConfig,
} from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // Field name → error message
}

export function validateSchemaValue(
  value: JsonValue | string | undefined,
  schema: ParameterSchema,
  required: boolean
): string | null {
  // Check required fields
  const requiredError = validateRequired(value, required);
  if (requiredError) return requiredError;

  // Skip validation for empty optional fields
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }

  const type = schema.type || 'string';

  // Type-specific validation
  let typeError: string | null = null;
  switch (type) {
    case 'integer':
      typeError = validateInteger(value, schema);
      break;
    case 'number':
      typeError = validateNumber(value, schema);
      break;
    case 'array':
      typeError = validateArray(value);
      break;
    case 'object':
      typeError = validateObject(value);
      break;
    case 'boolean':
      typeError = validateBoolean(value);
      break;
  }

  if (typeError) return typeError;

  // Enum validation
  return validateEnum(value, schema);
}

export function validateToolConfig(
  config: ToolBlockConfig,
  paramSchema: Record<string, ParameterSchema>,
  requiredParams: string[]
): ValidationResult {
  const errors: Record<string, string> = {};

  // Type-safe access to params (handle both legacy and new names)
  const params = (config.params || config.arguments) as Record<string, JsonValue> | undefined;

  // Validate each parameter
  for (const [paramName, schema] of Object.entries(paramSchema)) {
    const value = params?.[paramName];
    const required = requiredParams.includes(paramName);
    const error = validateSchemaValue(value, schema, required);

    if (error) {
      errors[paramName] = error;
    }
  }

  // Check for missing required tool_name (handle legacy toolName)
  const toolName = config.tool_name || config.toolName;
  if (!toolName) {
    errors['__tool_name'] = 'Tool name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLlmConfig(config: LlmBlockConfig): ValidationResult {
  const errors: Record<string, string> = {};

  if (!config.user_prompt || config.user_prompt.trim() === '') {
    errors['user_prompt'] = 'User prompt is required';
  }

  if (!config.model) {
    errors['model'] = 'Model selection is required';
  }

  if (config.temperature !== undefined) {
    if (
      typeof config.temperature !== 'number' ||
      config.temperature < 0 ||
      config.temperature > 2
    ) {
      errors['temperature'] = 'Temperature must be between 0 and 2';
    }
  }

  if (config.structured_output && !config.response_format?.json_schema?.schema) {
    errors['output_schema'] = 'Output schema is required when using structured output';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateIfElseConfig(config: IfElseBlockConfig): ValidationResult {
  const errors: Record<string, string> = {};

  if (!config.condition || config.condition.trim() === '') {
    errors['condition'] = 'Condition expression is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateForLoopConfig(config: ForLoopBlockConfig): ValidationResult {
  const errors: Record<string, string> = {};

  // Handle both legacy and new property names
  const arrayVar = config.array_variable || config.array_var;
  if (!arrayVar || arrayVar.trim() === '') {
    errors['array_variable'] = 'Array variable is required';
  }

  const itemVar = config.item_var || config.item_variable;
  if (!itemVar || itemVar.trim() === '') {
    errors['item_var'] = 'Item variable name is required';
  }

  // Validate variable names are valid identifiers
  if (itemVar && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(itemVar)) {
    errors['item_var'] = 'Must be a valid variable name (letters, numbers, underscores)';
  }

  if (config.index_var && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.index_var)) {
    errors['index_var'] = 'Must be a valid variable name (letters, numbers, underscores)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper validation functions

function validateRequired(
  value: JsonValue | string | undefined,
  required: boolean
): string | null {
  if (required && (value === undefined || value === null || value === '')) {
    return 'This field is required';
  }
  return null;
}

function validateInteger(
  value: JsonValue | string | undefined,
  schema: ParameterSchema
): string | null {
  let numValue = value;

  if (typeof value === 'string' && value.trim() !== '') {
    if (!/^-?\d+$/.test(value.trim())) {
      return 'Must be a valid integer';
    }
    numValue = parseInt(value.trim(), 10);
  }

  if (typeof numValue === 'number') {
    if (!Number.isInteger(numValue)) {
      return 'Must be an integer (no decimals)';
    }
    if (schema.minimum !== undefined && numValue < schema.minimum) {
      return `Must be at least ${schema.minimum}`;
    }
    if (schema.maximum !== undefined && numValue > schema.maximum) {
      return `Must be at most ${schema.maximum}`;
    }
  }

  return null;
}

function validateNumber(
  value: JsonValue | string | undefined,
  schema: ParameterSchema
): string | null {
  let numValue = value;

  if (typeof value === 'string' && value.trim() !== '') {
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
      return 'Must be a valid number';
    }
    numValue = parseFloat(value.trim());
  }

  if (typeof numValue === 'number') {
    if (isNaN(numValue)) {
      return 'Must be a valid number';
    }
    if (schema.minimum !== undefined && numValue < schema.minimum) {
      return `Must be at least ${schema.minimum}`;
    }
    if (schema.maximum !== undefined && numValue > schema.maximum) {
      return `Must be at most ${schema.maximum}`;
    }
  }

  return null;
}

function validateArray(value: JsonValue | string | undefined): string | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return 'Must be a valid JSON array';
      }
    } catch {
      return 'Must be a valid JSON array';
    }
  } else if (!Array.isArray(value)) {
    return 'Must be an array';
  }
  return null;
}

function validateObject(value: JsonValue | string | undefined): string | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        return 'Must be a valid JSON object';
      }
    } catch {
      return 'Must be a valid JSON object';
    }
  } else if (typeof value !== 'object' || Array.isArray(value) || value === null) {
    return 'Must be an object';
  }
  return null;
}

function validateBoolean(value: JsonValue | string | undefined): string | null {
  if (typeof value !== 'boolean') {
    return 'Must be true or false';
  }
  return null;
}

function validateEnum(
  value: JsonValue | string | undefined,
  schema: ParameterSchema
): string | null {
  if (schema.enum && schema.enum.length > 0) {
    if (!schema.enum.includes(String(value))) {
      return `Must be one of: ${schema.enum.join(', ')}`;
    }
  }
  return null;
}

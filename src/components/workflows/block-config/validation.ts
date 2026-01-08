import { ParameterSchema } from './SchemaFormField';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // Field name → error message
}

export function validateSchemaValue(
  value: any,
  schema: ParameterSchema,
  required: boolean
): string | null {
  // Check required fields
  if (required && (value === undefined || value === null || value === '')) {
    return 'This field is required';
  }

  // Skip validation for empty optional fields
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }

  const type = schema.type || 'string';

  // Type-specific validation
  switch (type) {
    case 'integer':
      if (typeof value === 'string' && value.trim() !== '') {
        if (!/^-?\d+$/.test(value.trim())) {
          return 'Must be a valid integer';
        }
        value = parseInt(value.trim(), 10);
      }
      if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
          return 'Must be an integer (no decimals)';
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          return `Must be at least ${schema.minimum}`;
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
          return `Must be at most ${schema.maximum}`;
        }
      }
      break;

    case 'number':
      if (typeof value === 'string' && value.trim() !== '') {
        if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
          return 'Must be a valid number';
        }
        value = parseFloat(value.trim());
      }
      if (typeof value === 'number') {
        if (isNaN(value)) {
          return 'Must be a valid number';
        }
        if (schema.minimum !== undefined && value < schema.minimum) {
          return `Must be at least ${schema.minimum}`;
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
          return `Must be at most ${schema.maximum}`;
        }
      }
      break;

    case 'array':
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
      break;

    case 'object':
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
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return 'Must be true or false';
      }
      break;
  }

  // Enum validation
  if (schema.enum && schema.enum.length > 0) {
    if (!schema.enum.includes(String(value))) {
      return `Must be one of: ${schema.enum.join(', ')}`;
    }
  }

  return null; // No errors
}

export function validateToolConfig(
  config: Record<string, any>,
  paramSchema: Record<string, ParameterSchema>,
  requiredParams: string[]
): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate each parameter
  for (const [paramName, schema] of Object.entries(paramSchema)) {
    const value = config.params?.[paramName];
    const required = requiredParams.includes(paramName);
    const error = validateSchemaValue(value, schema, required);

    if (error) {
      errors[paramName] = error;
    }
  }

  // Check for missing required tool_name
  if (!config.tool_name) {
    errors['__tool_name'] = 'Tool name is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLlmConfig(config: Record<string, any>): ValidationResult {
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

  if (config.structured_output && !config.output_schema) {
    errors['output_schema'] = 'Output schema is required when using structured output';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateIfElseConfig(config: Record<string, any>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!config.condition || config.condition.trim() === '') {
    errors['condition'] = 'Condition expression is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateForLoopConfig(config: Record<string, any>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!config.array_variable || config.array_variable.trim() === '') {
    errors['array_variable'] = 'Array variable is required';
  }

  if (!config.item_var || config.item_var.trim() === '') {
    errors['item_var'] = 'Item variable name is required';
  }

  // Validate variable names are valid identifiers
  if (config.item_var && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.item_var)) {
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

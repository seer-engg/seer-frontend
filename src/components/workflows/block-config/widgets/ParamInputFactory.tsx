import { NumericParamInput } from './param-inputs/NumericParamInput';
import { BooleanParamInput } from './param-inputs/BooleanParamInput';
import { EnumParamInput } from './param-inputs/EnumParamInput';
import { ArrayParamInput } from './param-inputs/ArrayParamInput';
import { ObjectParamInput } from './param-inputs/ObjectParamInput';
import { TextParamInput } from './param-inputs/TextParamInput';
import type { TemplateAutocompleteControls } from '../types';

export interface ToolParamDefinition {
  type?: string;
  description?: string;
  required?: boolean;
  enum?: unknown[];
  [key: string]: unknown;
}

export interface ParamInputFactoryProps {
  paramName: string;
  paramDef: ToolParamDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  templateAutocomplete: TemplateAutocompleteControls;
}

/**
 * Factory component that renders the appropriate param input based on param type
 */
export function ParamInputFactory({
  paramName,
  paramDef,
  value,
  onChange,
  templateAutocomplete,
}: ParamInputFactoryProps) {
  const paramType = paramDef.type;
  const title = paramDef.description;

  // Boolean type
  if (paramType === 'boolean') {
    return (
      <BooleanParamInput
        paramName={paramName}
        value={value}
        onChange={onChange}
        title={title}
      />
    );
  }

  // Numeric types
  if (paramType === 'integer' || paramType === 'number') {
    return (
      <NumericParamInput
        paramName={paramName}
        value={value}
        onChange={onChange}
        paramType={paramType}
        templateAutocomplete={templateAutocomplete}
        title={title}
      />
    );
  }

  // Enum type
  if (paramDef.enum && Array.isArray(paramDef.enum)) {
    return (
      <EnumParamInput
        paramName={paramName}
        value={value}
        onChange={onChange as (value: string) => void}
        options={paramDef.enum}
        title={title}
      />
    );
  }

  // Array type
  if (paramType === 'array') {
    return (
      <ArrayParamInput
        paramName={paramName}
        value={value}
        onChange={onChange}
        templateAutocomplete={templateAutocomplete}
        title={title}
      />
    );
  }

  // Object type
  if (paramType === 'object') {
    return (
      <ObjectParamInput
        paramName={paramName}
        value={value}
        onChange={onChange}
        templateAutocomplete={templateAutocomplete}
        title={title}
      />
    );
  }

  // Default: Text input
  return (
    <TextParamInput
      paramName={paramName}
      value={value}
      onChange={onChange as (value: string) => void}
      templateAutocomplete={templateAutocomplete}
      title={title}
    />
  );
}

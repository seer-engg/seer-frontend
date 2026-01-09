import { useEffect, useCallback, useMemo } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import {
  ToolBlockConfig,
  type ResourcePickerConfig,
  ToolMetadata,
  BlockSectionProps,
  TemplateAutocompleteControls,
} from '../types';
import { FormField } from '../widgets/FormField';
import { DynamicFormField } from '../widgets/DynamicFormField';
import type { ToolParamDefinition } from '../widgets/ParamInputFactory';

interface ToolBlockSectionProps extends BlockSectionProps<ToolBlockConfig> {
  toolSchema?: ToolMetadata;
}

function JsonParamsEditor({
  toolParams,
  setConfig,
}: {
  toolParams: Record<string, unknown>;
  setConfig: (updater: (prev: ToolBlockConfig) => ToolBlockConfig) => void;
}) {
  return (
    <div>
      <Label htmlFor="tool-params">Parameters (JSON)</Label>
      <Textarea
        id="tool-params"
        value={JSON.stringify(toolParams, null, 2)}
        onChange={e => {
          try {
            const params = JSON.parse(e.target.value);
            setConfig(prev => ({ ...prev, params }));
          } catch {
            // Ignore invalid JSON
          }
        }}
        placeholder='{"max_results": 5}'
        className="font-mono text-xs"
        rows={4}
      />
    </div>
  );
}

function updateConfigResourceLabels(
  prev: ToolBlockConfig,
  paramName: string,
  label?: string,
): ToolBlockConfig {
  const currentLabels = (prev.__resourceLabels as Record<string, string> | undefined) || {};
  const nextLabels = { ...currentLabels };

  if (label) {
    nextLabels[paramName] = label;
  } else {
    delete nextLabels[paramName];
  }

  if (Object.keys(nextLabels).length === 0) {
    const { __resourceLabels, ...rest } = prev;
    return rest;
  }

  return {
    ...prev,
    __resourceLabels: nextLabels,
  };
}

function syncOutputSchema(
  config: ToolBlockConfig,
  toolSchema?: ToolMetadata,
): ToolBlockConfig {
  if (!toolSchema?.output_schema || config.output_schema) {
    return config;
  }
  return {
    ...config,
    output_schema: toolSchema.output_schema,
  };
}

interface ParamFieldProps {
  paramName: string;
  paramDef: ToolParamDefinition;
  toolParams: Record<string, unknown>;
  requiredParams: string[];
  toolProvider: string;
  updateParams: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
  updateResourceLabel: (paramName: string, label?: string) => void;
  templateAutocomplete: TemplateAutocompleteControls;
  error?: string;
}

function ParamField({
  paramName,
  paramDef,
  toolParams,
  requiredParams,
  toolProvider,
  updateParams,
  updateResourceLabel,
  templateAutocomplete,
  error,
}: ParamFieldProps) {
  const paramValue = toolParams[paramName];
  const isRequired = requiredParams.includes(paramName);
  const resourcePicker = paramDef['x-resource-picker'] as ResourcePickerConfig | undefined;
  const dependsOnKey = resourcePicker?.depends_on;
  const dependsOnValues = dependsOnKey ? { [dependsOnKey]: toolParams[dependsOnKey] as string } : undefined;

  return (
    <DynamicFormField
      name={paramName}
      label={paramName}
      description={paramDef.description as string | undefined}
      required={isRequired}
      defaultValue={paramDef.default}
      value={paramValue}
      onChange={val => {
        updateParams(prev => ({
          ...prev,
          [paramName]: val,
        }));
      }}
      def={paramDef as any}
      provider={toolProvider}
      dependsOnValues={dependsOnValues}
      templateAutocomplete={templateAutocomplete}
      error={error}
      onResourceLabelChange={(field, label) => updateResourceLabel(field, label)}
    />
  );
}

export function ToolBlockSection({
  config,
  setConfig,
  toolSchema,
  templateAutocomplete,
  validationErrors = {},
}: ToolBlockSectionProps) {
  const toolParams = useMemo(() => config.params || {}, [config.params]);
  const paramSchema = useMemo(() => toolSchema?.parameters?.properties || {}, [toolSchema?.parameters?.properties]);
  const requiredParams = useMemo(() => toolSchema?.parameters?.required || [], [toolSchema?.parameters?.required]);
  const toolProvider = config.provider || toolSchema?.provider || 'google';

  const updateResourceLabel = useCallback(
    (paramName: string, label?: string) => {
      setConfig(prev => updateConfigResourceLabels(prev, paramName, label));
    },
    [setConfig],
  );

  useEffect(() => {
    setConfig(prev => syncOutputSchema(prev, toolSchema));
  }, [toolSchema, setConfig]);

  const updateParams = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setConfig(prev => ({
        ...prev,
        params: updater(prev.params || {}),
      }));
    },
    [setConfig],
  );

  if (Object.keys(paramSchema).length === 0) {
    return <JsonParamsEditor toolParams={toolParams} setConfig={setConfig} />;
  }

  return (
    <div className="space-y-2">
      {Object.entries(paramSchema).map(([name, def]) => (
        <ParamField
          key={name}
          paramName={name}
          paramDef={def}
          toolParams={toolParams}
          requiredParams={requiredParams}
          toolProvider={toolProvider}
          updateParams={updateParams}
          updateResourceLabel={updateResourceLabel}
          templateAutocomplete={templateAutocomplete}
          error={validationErrors?.[name]}
        />
      ))}
    </div>
  );
}


import { useEffect, useCallback, useMemo } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ResourcePicker } from '@/components/workflows/ResourcePicker';

import {
  ToolBlockConfig,
  ResourcePickerConfig,
  ToolMetadata,
  BlockSectionProps,
  TemplateAutocompleteControls,
} from '../types';
import { FormField } from '../widgets/FormField';
import { ParamInputFactory, type ToolParamDefinition } from '../widgets/ParamInputFactory';

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
}: ParamFieldProps) {
  const inputId = `param-${paramName}`;
  const paramValue = toolParams[paramName];
  const isRequired = requiredParams.includes(paramName);
  const hasDefault = paramDef.default !== undefined;
  const resourcePicker = paramDef['x-resource-picker'] as ResourcePickerConfig | undefined;
  const paramType = typeof paramDef.type === 'string' ? paramDef.type : 'string';

  return (
    <FormField
      key={paramName}
      label={paramName}
      description={paramDef.description}
      defaultValue={hasDefault ? (typeof paramDef.default === 'object' ? JSON.stringify(paramDef.default) : paramDef.default) : undefined}
      required={isRequired}
      htmlFor={inputId}
    >
      {resourcePicker ? (
        <>
          <ResourcePicker
            config={resourcePicker}
            provider={toolProvider}
            value={paramValue != null ? String(paramValue) : undefined}
            onChange={(nextValue, displayName) => {
              const parsedValue =
                paramType === 'integer'
                  ? (() => {
                      const asNumber = typeof nextValue === 'string' ? parseInt(nextValue, 10) : Number(nextValue);
                      return Number.isNaN(asNumber) ? nextValue : asNumber;
                    })()
                  : nextValue;
              updateParams(prev => ({
                ...prev,
                [paramName]: parsedValue,
              }));
              updateResourceLabel(paramName, displayName);
            }}
            placeholder={`Select ${paramName}...`}
            dependsOnValues={
              resourcePicker.depends_on
                ? { [resourcePicker.depends_on]: toolParams[resourcePicker.depends_on] }
                : undefined
            }
            className="text-xs"
          />
          {toolProvider === 'supabase' && paramName === 'integration_resource_id' && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Connect Supabase Mgmt, then use "Bind project" to select a project.
            </p>
          )}
        </>
      ) : (
        <ParamInputFactory
          paramName={paramName}
          paramDef={paramDef}
          value={paramValue}
          onChange={value => {
            updateParams(prev => ({
              ...prev,
              [paramName]: value,
            }));
          }}
          templateAutocomplete={templateAutocomplete}
        />
      )}
    </FormField>
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
        />
      ))}
    </div>
  );
}


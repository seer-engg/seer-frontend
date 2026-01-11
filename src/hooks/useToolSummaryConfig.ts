import { useMemo } from 'react';
import type { WorkflowNodeData } from '@/components/workflows/types';
import type { ToolMetadata } from '@/stores/toolsStore';

export function useToolSummaryConfig(
  data: WorkflowNodeData,
  toolSchema: ToolMetadata | undefined
) {
  const paramsObject = useMemo(() => {
    const params = data.config?.params;
    if (!params || typeof params !== 'object') {
      return null;
    }
    return params as Record<string, unknown>;
  }, [data.config]);

  const schemaParamDefaults = useMemo(() => {
    const properties = toolSchema?.parameters?.properties;
    if (!properties || typeof properties !== 'object') {
      return null;
    }
    const defaults: Record<string, unknown> = {};
    Object.entries(properties).forEach(([key, definition]) => {
      if (
        definition &&
        typeof definition === 'object' &&
        'default' in definition &&
        (definition as { default?: unknown }).default !== undefined
      ) {
        defaults[key] = (definition as { default?: unknown }).default;
      }
    });
    return Object.keys(defaults).length ? defaults : null;
  }, [toolSchema]);

  const paramsSummaryConfig = useMemo<Record<string, unknown> | null>(() => {
    if (!paramsObject && !schemaParamDefaults) {
      return null;
    }
    const summaryConfig: Record<string, unknown> = {
      ...(schemaParamDefaults ?? {}),
      ...(paramsObject ?? {}),
    };
    const labels = data.config?.__resourceLabels;
    if (labels && typeof labels === 'object') {
      summaryConfig.__resourceLabels = labels as Record<string, string>;
    }
    return summaryConfig;
  }, [data.config, paramsObject, schemaParamDefaults]);

  const summaryPriorityKeys = useMemo(() => {
    const required = toolSchema?.parameters?.required ?? [];
    const schemaProps = Object.keys(toolSchema?.parameters?.properties ?? {});
    const optional = schemaProps.filter((key) => !required.includes(key));
    const paramKeys = paramsObject ? Object.keys(paramsObject) : [];
    const defaultKeys = schemaParamDefaults ? Object.keys(schemaParamDefaults) : [];
    const orderedKeys = [...required, ...optional, ...paramKeys, ...defaultKeys];
    return Array.from(new Set(orderedKeys));
  }, [toolSchema, paramsObject, schemaParamDefaults]);

  return {
    paramsObject,
    schemaParamDefaults,
    paramsSummaryConfig,
    summaryPriorityKeys,
  };
}

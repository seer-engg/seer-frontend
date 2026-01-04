import { memo, useMemo } from 'react';

type SummaryEntry = {
  key: string;
  label: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  tool_name: 'Tool',
  toolName: 'Tool',
  model: 'Model',
  temperature: 'Temp',
  system_prompt: 'System',
  user_prompt: 'Prompt',
  condition: 'Condition',
  array_variable: 'Array',
  array_var: 'Array',
  array_mode: 'Mode',
  item_var: 'Item Var',
  variable_name: 'Variable',
  variable: 'Variable',
  output_key: 'Output',
  operation: 'Operation',
  endpoint: 'Endpoint',
  fields: 'Fields',
};

const DEFAULT_PRIORITY: string[] = [
  'tool_name',
  'toolName',
  'operation',
  'model',
  'user_prompt',
  'system_prompt',
  'temperature',
  'condition',
  'array_variable',
  'array_var',
  'item_var',
  'variable_name',
  'fields',
];

const isPrimitiveSummaryValue = (value: unknown) =>
  ['string', 'number', 'boolean'].includes(typeof value);

const formatFieldsValue = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const names = value
    .map((field) => {
      if (typeof field !== 'object' || field === null) {
        return '';
      }
      const nameCandidate =
        (field as Record<string, any>).displayLabel ||
        (field as Record<string, any>).name ||
        '';
      return typeof nameCandidate === 'string' ? nameCandidate.trim() : '';
    })
    .filter(Boolean);

  if (names.length === 0) {
    return `${value.length} field${value.length === 1 ? '' : 's'}`;
  }

  const preview = names.slice(0, 2).join(', ');
  const remaining = names.length > 2 ? ` +${names.length - 2}` : '';
  return `${preview}${remaining}`;
};

const formatValue = (value: unknown, key: string): string | null => {
  if (key === 'fields') {
    return formatFieldsValue(value);
  }
  if (value == null) {
    return null;
  }
  if (isPrimitiveSummaryValue(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const compactItems = value
      .map((item) => (isPrimitiveSummaryValue(item) ? String(item) : ''))
      .filter(Boolean);
    if (compactItems.length === 0) {
      return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }
    const preview = compactItems.slice(0, 2).join(', ');
    const extra = compactItems.length > 2 ? ` +${compactItems.length - 2}` : '';
    return `${preview}${extra}`;
  }
  return null;
};

const normalizeLabel = (key: string) =>
  FIELD_LABELS[key] ?? key.replace(/_/g, ' ');

const addEntry = (
  entries: SummaryEntry[],
  seenKeys: Set<string>,
  key: string,
  value: unknown,
) => {
  if (seenKeys.has(key)) {
    return;
  }
  const formattedValue = formatValue(value, key);
  if (!formattedValue) {
    return;
  }
  seenKeys.add(key);
  entries.push({
    key,
    label: normalizeLabel(key),
    value: formattedValue,
  });
};

export interface WorkflowNodeSummaryProps {
  config?: Record<string, any> | null;
  priorityKeys?: string[];
  limit?: number;
  fallbackMessage?: string;
}

export const getWorkflowNodeSummaryEntries = (
  config?: Record<string, any> | null,
  priorityKeys: string[] = [],
  limit = 3,
): SummaryEntry[] => {
  if (!config) {
    return [];
  }

  const entries: SummaryEntry[] = [];
  const seenKeys = new Set<string>();
  const orderedKeys = [...priorityKeys, ...DEFAULT_PRIORITY];

  orderedKeys.forEach((key) => {
    if (key in config) {
      addEntry(entries, seenKeys, key, config[key]);
    }
  });

  Object.entries(config).forEach(([key, value]) => {
    addEntry(entries, seenKeys, key, value);
  });

  return entries.slice(0, limit);
};

export const WorkflowNodeSummary = memo(function WorkflowNodeSummary({
  config,
  priorityKeys,
  limit = 3,
  fallbackMessage = 'Double-click to configure',
}: WorkflowNodeSummaryProps) {
  const entries = useMemo(
    () => getWorkflowNodeSummaryEntries(config, priorityKeys, limit),
    [config, priorityKeys, limit],
  );

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{fallbackMessage}</p>;
  }

  return (
    <dl className="space-y-1 text-xs text-muted-foreground w-[260px] max-w-full">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center justify-between gap-3">
          <dt className="truncate">{entry.label}</dt>
          <dd className="truncate text-right font-medium text-foreground">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
});



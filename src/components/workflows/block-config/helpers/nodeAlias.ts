import { Node } from '@xyflow/react';

import { WorkflowNodeData } from '@/components/workflows/types';

export const sanitizeAlias = (value?: string | null): string | null => {
  if (!value) return null;
  const alias = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  if (!alias) return null;
  return /^\d/.test(alias) ? `_${alias}` : alias;
};

export const getNodeAlias = (node?: Node<WorkflowNodeData> | null): string => {
  if (!node) return '';
  const data = node.data || {};
  const config = data.config || {};
  const candidates: Array<string | undefined> = [
    data.label,
    (config.tool_name as string) || (config.toolName as string),
    config.variable_name as string,
    node.id,
  ];
  for (const candidate of candidates) {
    const alias = sanitizeAlias(candidate);
    if (alias) {
      return alias;
    }
  }
  return '';
};


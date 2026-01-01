import { Node } from '@xyflow/react';

import { WorkflowEdge, WorkflowNodeData } from '@/components/workflows/types';

import { getNodeAlias, sanitizeAlias } from './nodeAlias';

interface NodeOutputMetadata {
  identifier: string;
  properties: string[];
}

const INPUT_IDENTIFIER = 'inputs';

export const collectAvailableVariables = (
  allNodes: Node<WorkflowNodeData>[] = [],
  allEdges: WorkflowEdge[] = [],
  currentNode?: Node<WorkflowNodeData> | null
): string[] => {
  if (!currentNode) {
    return [];
  }

  const nodeMap = new Map(allNodes.map((node) => [node.id, node]));
  const ancestorIds = findAncestorNodeIds(currentNode.id, allEdges);
  const suggestions = new Set<string>();

  ancestorIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return;
    }
    const metadata = buildNodeOutputMetadata(node);
    addMetadataToSuggestions(metadata, suggestions);
  });

  return Array.from(suggestions).sort();
};

function findAncestorNodeIds(nodeId: string, edges: WorkflowEdge[] = []): string[] {
  const incomingMap = edges.reduce<Map<string, WorkflowEdge[]>>((map, edge) => {
    if (!edge?.target) {
      return map;
    }
    const existing = map.get(edge.target) ?? [];
    existing.push(edge);
    map.set(edge.target, existing);
    return map;
  }, new Map());

  const visited = new Set<string>();
  const stack = [nodeId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const incomingEdges = incomingMap.get(current) ?? [];
    incomingEdges.forEach((edge) => {
      const sourceId = edge.source;
      if (!sourceId || sourceId === nodeId || visited.has(sourceId)) {
        return;
      }
      visited.add(sourceId);
      stack.push(sourceId);
    });
  }

  return Array.from(visited);
}

function buildNodeOutputMetadata(node: Node<WorkflowNodeData>): NodeOutputMetadata | null {
  const nodeType = node.data?.type;
  if (!nodeType) {
    return null;
  }

  if (nodeType === 'input') {
    const propertyNames = collectInputFieldNames(node);
    if (propertyNames.length === 0) {
      return null;
    }
    return {
      identifier: INPUT_IDENTIFIER,
      properties: propertyNames,
    };
  }

  const identifier = getOutputIdentifier(node);
  if (!identifier) {
    return null;
  }

  const schema = node.data?.config?.output_schema;
  const properties = extractSchemaProperties(schema);

  return {
    identifier,
    properties,
  };
}

function collectInputFieldNames(node: Node<WorkflowNodeData>): string[] {
  const config = node.data?.config || {};
  const names = new Set<string>();

  if (typeof config.variable_name === 'string' && config.variable_name.trim()) {
    names.add(config.variable_name.trim());
  }

  if (Array.isArray(config.fields)) {
    config.fields.forEach((field: any) => {
      const fieldName = typeof field?.name === 'string' ? field.name.trim() : '';
      if (fieldName) {
        names.add(fieldName);
      }
    });
  }

  return Array.from(names).sort();
}

function getOutputIdentifier(node: Node<WorkflowNodeData>): string | null {
  const config = node.data?.config || {};
  const explicitOut =
    typeof config.out === 'string' ? sanitizeAlias(config.out) : null;

  if (explicitOut) {
    return explicitOut;
  }

  const alias = getNodeAlias(node);
  return alias || null;
}

function extractSchemaProperties(schema: unknown): string[] {
  return Array.from(collectSchemaPaths(schema)).sort();
}

function collectSchemaPaths(schema: unknown, prefix = ''): Set<string> {
  const paths = new Set<string>();

  if (!isSchemaRecord(schema)) {
    return paths;
  }

  const schemaType = schema.type;

  if (schemaType === 'object' && isSchemaRecord(schema.properties)) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      paths.add(nextPath);
      collectSchemaPaths(value, nextPath).forEach((childPath) => paths.add(childPath));
    });
  } else if (schemaType === 'array' && 'items' in schema) {
    const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    const indexPath = prefix ? `${prefix}[0]` : '[0]';
    paths.add(indexPath);
    collectSchemaPaths(itemsSchema, indexPath).forEach((childPath) => paths.add(childPath));
  }

  return paths;
}

function isSchemaRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addMetadataToSuggestions(
  metadata: NodeOutputMetadata | null,
  suggestions: Set<string>,
): void {
  if (!metadata || !metadata.identifier) {
    return;
  }

  suggestions.add(metadata.identifier);
  metadata.properties.forEach((property) => {
    suggestions.add(`${metadata.identifier}.${property}`);
  });
}

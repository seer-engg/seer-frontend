import type { Node } from '@xyflow/react';

import { getNodeAlias, sanitizeAlias } from '@/components/workflows/block-config/helpers/nodeAlias';
import type { WorkflowEdge, WorkflowNodeData } from '@/components/workflows/types';
import type { JsonObject, JsonValue, WorkflowNode, WorkflowSpec } from '@/types/workflow-spec';
import type { RawNode, RawEdge } from '@/types/workflow-api';
import { isRawNode, isRawEdge } from '@/types/workflow-api';

export interface WorkflowGraphData {
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
}

type FlowNode = Node<WorkflowNodeData>;
type BranchLabel = 'true' | 'false' | 'loop' | 'exit';

interface GraphContext {
  nodeById: Map<string, FlowNode>;
  outgoing: Map<string, WorkflowEdge[]>;
  incoming: Map<string, WorkflowEdge[]>;
}

const GRAPH_META_KEY = 'reactflow_graph';
const DEFAULT_LLM_USER_PROMPT = 'Enter your prompt here';
const MUSTACHE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const DOLLAR_RE = /\$\{\s*([^}]+?)\s*\}/g;

/**
 * Safely serializes the current canvas graph into a WorkflowSpec payload.
 */
export function graphToWorkflowSpec(
  graph: WorkflowGraphData,
  existing?: WorkflowSpec,
): WorkflowSpec {
  const serialized = serializeGraph(graph);
  const inputs = existing?.inputs ? { ...existing.inputs } : {};

  const nodes = buildWorkflowNodes(graph);

  return {
    version: existing?.version ?? '1',
    inputs,
    nodes,
    output: existing?.output,
    meta: {
      ...(existing?.meta ?? {}),
      [GRAPH_META_KEY]: serialized,
    },
  };
}

/**
 * Reconstructs ReactFlow nodes/edges from a WorkflowSpec payload.
 */
export function workflowSpecToGraph(spec: WorkflowSpec): WorkflowGraphData {
  const serialized = spec.meta?.[GRAPH_META_KEY];
  
  if (serialized && typeof serialized === 'object') {
    const graph = deserializeGraph(serialized as JsonObject);
    return stripInputNodes(graph);
  }
  return stripInputNodes(buildGraphFromSpec(spec));
}

function buildWorkflowNodes(graph: WorkflowGraphData): WorkflowNode[] {
  // Filter out trigger nodes - they represent workflow entry points (webhooks, schedules, etc.)
  // and are stored separately in the workflow metadata, not as executable workflow nodes.
  const executableNodes = graph.nodes.filter((node) => node.data?.type !== 'trigger');
  const filteredGraph: WorkflowGraphData = {
    nodes: executableNodes,
    edges: graph.edges.filter(
      (edge) =>
        executableNodes.some((n) => n.id === edge.source) &&
        executableNodes.some((n) => n.id === edge.target),
    ),
  };

  const ctx = createGraphContext(filteredGraph);
  const visited = new Set<string>();
  const result: WorkflowNode[] = [];

  const rootIds = findRootNodeIds(filteredGraph.nodes, ctx);
  rootIds.forEach((rootId) => {
    result.push(...buildLinearChain(rootId, ctx, visited));
  });

  // Catch any remaining nodes that might not be reachable from a root
  filteredGraph.nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      result.push(...buildLinearChain(node.id, ctx, visited));
    }
  });

  return result;
}

function findRootNodeIds(nodes: FlowNode[], ctx: GraphContext): string[] {
  const roots = nodes.filter((node) => {
    const incoming = ctx.incoming.get(node.id) ?? [];
    const hasIncoming = incoming.some((edge) => ctx.nodeById.has(edge.source));
    return !hasIncoming;
  });

  return roots.sort(compareNodes).map((node) => node.id);
}

function buildLinearChain(startId: string, ctx: GraphContext, visited: Set<string>): WorkflowNode[] {
  const sequence: WorkflowNode[] = [];
  let currentId: string | undefined = startId;

  while (currentId) {
    if (visited.has(currentId)) {
      break;
    }

    const node = ctx.nodeById.get(currentId);
    if (!node) {
      visited.add(currentId);
      break;
    }

    const specNode = convertNode(node, ctx, visited);
    sequence.push(specNode);
    visited.add(node.id);

    const nextId = findNextNodeId(node, ctx, visited);
    if (!nextId) {
      break;
    }
    currentId = nextId;
  }

  return sequence;
}

function convertNode(node: FlowNode, ctx: GraphContext, visited: Set<string>): WorkflowNode {
  switch (node.data?.type) {
    case 'tool':
      return createToolNode(node);
    case 'llm':
      return createLlmNode(node);
    case 'if_else':
      return createIfNode(node, ctx, visited);
    case 'for_loop':
      return createForEachNode(node, ctx, visited);
    default:
      throw new Error(`Unsupported block type '${node.data?.type ?? 'unknown'}' on node '${node.id}'.`);
  }
}

function createToolNode(node: FlowNode): WorkflowNode {
  const config = node.data?.config ?? {};
  const toolName = config.tool_name || config.toolName;
  if (!toolName) {
    throw new Error(`Tool block '${node.data?.label ?? node.id}' is missing a tool selection.`);
  }

  const params = isRecord(config.params)
    ? (convertTemplateStrings(config.params, 'toCompiler') as Record<string, JsonValue>)
    : {};

  const inlineSchema = buildInlineSchemaSpec(config.output_schema);
  const expectOutput = inlineSchema
    ? {
        mode: 'json' as const,
        schema: inlineSchema,
      }
    : undefined;

  return {
    id: node.id,
    type: 'tool',
    tool: toolName,
    in: params,
    out: deriveOutName(node),
    expect_output: expectOutput,
  };
}

function createLlmNode(node: FlowNode): WorkflowNode {
  const config = node.data?.config ?? {};
  const model = config.model || 'gpt-5-mini';
  const systemPrompt = convertTemplateString(config.system_prompt || '');
  const rawUserPrompt = config.user_prompt || '';
  const userPrompt =
    rawUserPrompt && rawUserPrompt !== DEFAULT_LLM_USER_PROMPT
      ? convertTemplateString(rawUserPrompt)
      : '';

  const promptParts = [systemPrompt, userPrompt].filter(Boolean);
  if (promptParts.length === 0) {
    throw new Error(`LLM block '${node.data?.label ?? node.id}' requires a prompt.`);
  }

  const prompt = promptParts.join('\n\n').trim();

  const inputRefs = isRecord(config.input_refs)
    ? (convertTemplateStrings(config.input_refs, 'toCompiler') as Record<string, JsonValue>)
    : {};

  const inlineSchema = buildInlineSchemaSpec(config.output_schema);
  const outputSchema = inlineSchema
    ? { mode: 'json' as const, schema: inlineSchema }
    : { mode: 'text' as const };

  const temperature =
    typeof config.temperature === 'number'
      ? config.temperature
      : typeof config.temperature === 'string'
        ? Number(config.temperature)
        : undefined;

  const maxTokens =
    typeof config.max_tokens === 'number'
      ? config.max_tokens
      : typeof config.max_tokens === 'string'
        ? Number(config.max_tokens)
        : undefined;

  return {
    id: node.id,
    type: 'llm',
    model,
    prompt,
    in: inputRefs,
    out: deriveOutName(node),
    output: outputSchema,
    temperature: Number.isFinite(temperature) ? temperature : undefined,
    max_tokens: Number.isFinite(maxTokens) ? maxTokens : undefined,
  };
}

function createIfNode(node: FlowNode, ctx: GraphContext, visited: Set<string>): WorkflowNode {
  const config = node.data?.config ?? {};
  const conditionRaw = String(config.condition ?? '').trim();
  if (!conditionRaw) {
    throw new Error(`If block '${node.data?.label ?? node.id}' requires a condition.`);
  }

  const thenBranch = buildBranchSequence(node.id, 'true', ctx, visited);
  const elseBranch = buildBranchSequence(node.id, 'false', ctx, visited);

  return {
    id: node.id,
    type: 'if',
    condition: convertTemplateString(conditionRaw),
    then: thenBranch,
    else: elseBranch,
    out: deriveOutName(node),
  };
}

function createForEachNode(node: FlowNode, ctx: GraphContext, visited: Set<string>): WorkflowNode {
  const config = node.data?.config ?? {};
  const mode = config.array_mode === 'literal' ? 'literal' : 'variable';

  let items: string;
  if (mode === 'literal') {
    const literal = Array.isArray(config.array_literal) ? config.array_literal : [];
    const normalizedLiteral = convertTemplateStrings(literal, 'toCompiler');
    items = JSON.stringify(normalizedLiteral);
  } else {
    const variableRef = String(config.array_variable ?? config.array_var ?? '').trim();
    if (!variableRef) {
      throw new Error(`For loop '${node.data?.label ?? node.id}' requires an array reference.`);
    }
    items = convertTemplateString(variableRef);
  }

  const body = buildBranchSequence(node.id, 'loop', ctx, visited);

  return {
    id: node.id,
    type: 'for_each',
    items,
    body,
    item_var: config.item_var || 'item',
    index_var: config.index_var || 'index',
    out: deriveOutName(node),
  };
}

function buildBranchSequence(
  sourceId: string,
  branchLabel: BranchLabel,
  ctx: GraphContext,
  visited: Set<string>,
): WorkflowNode[] {
  const edges = (ctx.outgoing.get(sourceId) ?? []).filter(
    (edge) => getBranch(edge) === branchLabel,
  );
  return edges.flatMap((edge) => buildLinearChain(edge.target, ctx, visited));
}

function findNextNodeId(
  node: FlowNode,
  ctx: GraphContext,
  visited: Set<string>,
): string | undefined {
  const edges = ctx.outgoing.get(node.id) ?? [];

  if (node.data?.type === 'for_loop') {
    const exitEdge = edges.find((edge) => getBranch(edge) === 'exit' && !visited.has(edge.target));
    if (exitEdge) {
      return exitEdge.target;
    }
  }

  const defaultEdge = edges.find((edge) => !getBranch(edge) && !visited.has(edge.target));
  return defaultEdge?.target;
}

function deriveOutName(node: FlowNode): string | undefined {
  const config = node.data?.config ?? {};
  if (typeof config.out === 'string') {
    const sanitized = sanitizeAlias(config.out);
    if (sanitized) {
      return sanitized;
    }
  }
  const alias = getNodeAlias(node);
  return alias || undefined;
}

function createGraphContext(graph: WorkflowGraphData): GraphContext {
  const nodeById = new Map<string, FlowNode>();
  graph.nodes.forEach((node) => {
    nodeById.set(node.id, node);
  });

  const outgoing = new Map<string, WorkflowEdge[]>();
  const incoming = new Map<string, WorkflowEdge[]>();

  graph.edges.forEach((edge) => {
    const sourceEdges = outgoing.get(edge.source) ?? [];
    sourceEdges.push(edge);
    outgoing.set(edge.source, sourceEdges);

    const targetEdges = incoming.get(edge.target) ?? [];
    targetEdges.push(edge);
    incoming.set(edge.target, targetEdges);
  });

  const edgeSorter = (a: WorkflowEdge, b: WorkflowEdge) =>
    compareNodes(
      nodeById.get(a.target) ?? ({ position: { x: 0, y: 0 } } as FlowNode),
      nodeById.get(b.target) ?? ({ position: { x: 0, y: 0 } } as FlowNode),
    );

  outgoing.forEach((edges, key) => {
    outgoing.set(key, edges.sort(edgeSorter));
  });
  incoming.forEach((edges, key) => {
    incoming.set(key, edges.sort((a, b) => {
      const sourceA = nodeById.get(a.source);
      const sourceB = nodeById.get(b.source);
      return compareNodes(
        sourceA ?? ({ position: { x: 0, y: 0 } } as FlowNode),
        sourceB ?? ({ position: { x: 0, y: 0 } } as FlowNode),
      );
    }));
  });

  return { nodeById, outgoing, incoming };
}

function compareNodes(a?: FlowNode, b?: FlowNode): number {
  const ay = a?.position?.y ?? 0;
  const by = b?.position?.y ?? 0;
  if (ay !== by) {
    return ay - by;
  }
  const ax = a?.position?.x ?? 0;
  const bx = b?.position?.x ?? 0;
  if (ax !== bx) {
    return ax - bx;
  }
  return (a?.id ?? '').localeCompare(b?.id ?? '');
}

function getBranch(edge: WorkflowEdge): BranchLabel | undefined {
  const branch = edge.data?.branch;
  if (branch === 'true' || branch === 'false' || branch === 'loop' || branch === 'exit') {
    return branch;
  }
  return undefined;
}

function serializeGraph(graph: WorkflowGraphData): JsonObject {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: sanitizeNodeData(node.data),
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: edge.data ?? null,
    })),
  };
}

function sanitizeNodeData(data: WorkflowNodeData | undefined): JsonObject {
  if (!data) {
    return {};
  }
  const { onSelect, ...rest } = data;

  // Deep clone to ensure all nested structures are preserved
  return JSON.parse(JSON.stringify(rest));
}

function deserializeGraph(serialized: JsonObject): WorkflowGraphData {
  const rawNodes = Array.isArray(serialized.nodes) ? serialized.nodes : [];
  const nodes = rawNodes
    .filter((n): n is RawNode => isRawNode(n))
    .map((node) => ({
      id: String(node.id),
      type: String(node.type),
      position: node.position ?? { x: 0, y: 0 },
      data: (node.data ?? {}) as Record<string, unknown>,
    }));

  const rawEdges = Array.isArray(serialized.edges) ? serialized.edges : [];
  const edges = rawEdges
    .filter((e): e is RawEdge => isRawEdge(e))
    .map((edge) => ({
      id: String(edge.id ?? `${edge.source}-${edge.target}`),
      source: String(edge.source),
      target: String(edge.target),
      sourceHandle: (edge as RawEdge).sourceHandle ?? null,
      targetHandle: (edge as RawEdge).targetHandle ?? null,
      data: ((edge as RawEdge).data as unknown) as WorkflowEdge['data'] ?? undefined,
    }));

  return { nodes: nodes as FlowNode[], edges: edges as WorkflowEdge[] };
}

function buildGraphFromSpec(spec: WorkflowSpec): WorkflowGraphData {
  const nodes: FlowNode[] = [];
  const edges: WorkflowEdge[] = [];

  spec.nodes.forEach((specNode, index) => {
    const nodeId = specNode.id || `node-${index}`;
    const flowNode: FlowNode = {
      id: nodeId,
      type: mapSpecNodeType(specNode.type),
      position: { x: index * 280, y: index * 120 },
      data: convertSpecNodeToData(specNode),
    };
    nodes.push(flowNode);

    const previous = spec.nodes[index - 1];
    if (previous) {
      edges.push({
        id: `edge-${previous.id || `node-${index - 1}`}-${nodeId}`,
        source: previous.id || `node-${index - 1}`,
        target: nodeId,
        sourceHandle: null,
        targetHandle: null,
        data: undefined,
      } as WorkflowEdge);
    }
  });

  return { nodes, edges };
}

function mapSpecNodeType(specType: WorkflowNode['type']): WorkflowNodeData['type'] {
  switch (specType) {
    case 'tool':
      return 'tool';
    case 'llm':
      return 'llm';
    case 'if':
      return 'if_else';
    case 'for_each':
      return 'for_loop';
    default:
      return 'tool';
  }
}

function convertSpecNodeToData(specNode: WorkflowNode): WorkflowNodeData {
  switch (specNode.type) {
    case 'tool': {
      const toolInputs = getSpecNodeInputs(specNode);
      const toolOutputSchema =
        specNode.expect_output?.mode === 'json'
          ? unwrapInlineSchema(specNode.expect_output.schema)
          : undefined;
      return {
        type: 'tool',
        label: specNode.id,
        config: {
          tool_name: specNode.tool,
          params: convertTemplateStrings(toolInputs ?? {}, 'toBuilder'),
          ...(specNode.out ? { out: specNode.out } : {}),
          ...(toolOutputSchema ? { output_schema: toolOutputSchema } : {}),
        },
      };
    }
    case 'llm': {
      const llmInputs = getSpecNodeInputs(specNode);
      const llmOutputSchema =
        specNode.output?.mode === 'json'
          ? unwrapInlineSchema(specNode.output?.schema)
          : undefined;
      return {
        type: 'llm',
        label: specNode.id,
        config: {
          model: specNode.model,
          user_prompt: convertTemplateString(specNode.prompt, 'toBuilder'),
          input_refs: convertTemplateStrings(llmInputs ?? {}, 'toBuilder'),
          ...(specNode.out ? { out: specNode.out } : {}),
          ...(llmOutputSchema ? { output_schema: llmOutputSchema } : {}),
          temperature: specNode.temperature,
          max_tokens: specNode.max_tokens,
        },
      };
    }
    case 'if':
      return {
        type: 'if_else',
        label: specNode.id,
        config: {
          condition: convertTemplateString(specNode.condition, 'toBuilder'),
          ...(specNode.out ? { out: specNode.out } : {}),
        },
      };
    case 'for_each':
      return {
        type: 'for_loop',
        label: specNode.id,
        config: {
          array_mode: 'variable',
          array_variable: convertTemplateString(specNode.items, 'toBuilder'),
          item_var: specNode.item_var,
          index_var: specNode.index_var,
          ...(specNode.out ? { out: specNode.out } : {}),
        },
      };
    default:
      return {
        type: 'tool',
        label: specNode.id,
        config: {},
      };
  }
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeJsonSchema(schema: unknown): JsonObject | undefined {
  if (!isRecord(schema)) {
    return undefined;
  }
  if (Object.keys(schema).length === 0) {
    return undefined;
  }
  return schema as JsonObject;
}

function buildInlineSchemaSpec(schema: unknown): JsonObject | undefined {
  const jsonSchema = normalizeJsonSchema(schema);
  if (!jsonSchema) {
    return undefined;
  }
  return { json_schema: jsonSchema };
}

function unwrapInlineSchema(schemaSpec: unknown): JsonObject | undefined {
  if (!isRecord(schemaSpec)) {
    return undefined;
  }

  if (
    'json_schema' in schemaSpec &&
    isRecord((schemaSpec as Record<string, JsonValue>).json_schema)
  ) {
    return (schemaSpec as { json_schema: JsonObject }).json_schema;
  }

  if (
    'schema' in schemaSpec &&
    isRecord((schemaSpec as Record<string, JsonValue>).schema)
  ) {
    return (schemaSpec as { schema: JsonObject }).schema;
  }

  if (
    'id' in schemaSpec &&
    typeof (schemaSpec as Record<string, JsonValue>).id === 'string' &&
    Object.keys(schemaSpec).length === 1
  ) {
    return undefined;
  }

  return schemaSpec as JsonObject;
}

type TemplateDirection = 'toCompiler' | 'toBuilder';

function convertTemplateStrings<T>(value: T, direction: TemplateDirection): T {
  if (typeof value === 'string') {
    return convertTemplateString(value, direction) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertTemplateStrings(item, direction)) as T;
  }
  if (isRecord(value)) {
    return Object.entries(value).reduce<Record<string, JsonValue>>((acc, [key, val]) => {
      acc[key] = convertTemplateStrings(val, direction);
      return acc;
    }, {}) as T;
  }
  return value;
}

function convertTemplateString(value: string, direction: TemplateDirection = 'toCompiler'): string {
  if (!value) {
    return value;
  }
  if (direction === 'toCompiler') {
    return value.replace(MUSTACHE_RE, (_, expr: string) => `\${${expr.trim()}}`);
  }
  return value.replace(DOLLAR_RE, (_, expr: string) => `{{${expr.trim()}}}`);
}

function getSpecNodeInputs(specNode: WorkflowNode): Record<string, JsonValue> | undefined {
  // Only Task/Tool/LLM nodes have inputs; they expose either `in` or legacy `in_`
  const withInputs = specNode as Partial<{ in: unknown; in_: unknown }>;
  const rawInputs = (withInputs.in ?? withInputs.in_);
  if (isRecord(rawInputs)) {
    return rawInputs as Record<string, JsonValue>;
  }
  return undefined;
}

function stripInputNodes(graph: WorkflowGraphData): WorkflowGraphData {
  const removedIds = new Set(
    graph.nodes
      .filter((node) => {
        const nodeType = (node.data?.type ?? node.type) as string | undefined;
        return nodeType === 'input';
      })
      .map((node) => node.id),
  );
  if (removedIds.size === 0) {
    return graph;
  }
  return {
    nodes: graph.nodes.filter((node) => !removedIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
    ),
  };
}



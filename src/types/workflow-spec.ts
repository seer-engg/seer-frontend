/**
 * TypeScript mirror of the backend WorkflowSpec schema.
 *
 * We only model the fields we actually need on the frontend so that
 * conversions between ReactFlow graph data and backend contracts stay typed.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

export interface SchemaRef {
  id: string;
}

export interface InlineSchema {
  json_schema: JsonObject;
}

export interface InlineSchemaAlias {
  schema: JsonObject;
}

export type SchemaSpec = SchemaRef | InlineSchema | InlineSchemaAlias | JsonObject;

export interface OutputContract {
  mode: 'text' | 'json';
  schema?: SchemaSpec;
}

export interface InputDef {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: JsonValue;
  required?: boolean;
}

export interface NodeMeta extends JsonObject {
  reactflow?: JsonObject;
}

interface NodeBase {
  id: string;
  out?: string;
  meta?: NodeMeta;
}

export interface TaskNode extends NodeBase {
  type: 'task';
  kind: 'set';
  value: JsonValue;
  in?: JsonObject;
  in_?: JsonObject;
  output?: OutputContract | null;
}

export interface ToolNode extends NodeBase {
  type: 'tool';
  tool: string;
  in?: JsonObject;
  in_?: JsonObject;
  expect_output?: OutputContract | null;
}

export interface LlmNode extends NodeBase {
  type: 'llm';
  model: string;
  prompt: string;
  in?: JsonObject;
  in_?: JsonObject;
  output: OutputContract;
  temperature?: number | null;
  max_tokens?: number | null;
}

export interface IfNode extends NodeBase {
  type: 'if';
  condition: string;
  then: WorkflowNode[];
  else?: WorkflowNode[];
}

export interface ForEachNode extends NodeBase {
  type: 'for_each';
  items: string;
  body: WorkflowNode[];
  item_var?: string;
  index_var?: string;
  output?: OutputContract | null;
}

export type WorkflowNode = TaskNode | ToolNode | LlmNode | IfNode | ForEachNode;

export interface WorkflowSpec {
  version: string;
  inputs: Record<string, InputDef>;
  nodes: WorkflowNode[];
  output?: JsonValue;
  meta?: JsonObject;
}

export interface WorkflowMeta {
  last_compile_ok: boolean;
}

export interface WorkflowVersionSummary {
  version_id: number;
  status: string;
  version_number?: number;
  created_from_draft_revision?: number;
  created_at: string;
}

export interface WorkflowVersionListItem extends WorkflowVersionSummary {
  is_latest: boolean;
  is_published: boolean;
}

export interface WorkflowVersionListResponse {
  workflow_id: string;
  draft_revision: number;
  versions: WorkflowVersionListItem[];
  latest_version_id?: number | null;
  published_version_id?: number | null;
}

export interface WorkflowVersionRestoreRequest {
  base_revision?: number;
}

export interface WorkflowSummary {
  workflow_id: string;
  name: string;
  description?: string | null;
  draft_revision: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowResponse extends WorkflowSummary {
  spec: WorkflowSpec;
  tags: string[];
  meta: WorkflowMeta;
  published_version?: WorkflowVersionSummary | null;
  latest_version?: WorkflowVersionSummary | null;
}

export interface WorkflowListResponse {
  items: WorkflowSummary[];
  next_cursor?: string | null;
}

export interface WorkflowCreateRequest {
  name: string;
  description?: string;
  spec: WorkflowSpec;
  tags?: string[];
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string | null;
  tags?: string[];
}

export interface WorkflowDraftPatchRequest {
  base_revision?: number;
  spec: WorkflowSpec;
}

export interface WorkflowPublishRequest {
  version_id: number;
}

export interface RunFromWorkflowRequest {
  version?: number;
  inputs?: Record<string, JsonValue>;
  config?: Record<string, JsonValue>;
}

export interface RunFromSpecRequest {
  spec: WorkflowSpec;
  inputs?: Record<string, JsonValue>;
  config?: Record<string, JsonValue>;
}

export interface RunResponse {
  run_id: string;
  status: string;
  workflow_version_id?: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  progress?: {
    completed: number;
    total: number;
  } | null;
  current_node_id?: string | null;
  last_error?: string | null;
}

export interface RunResultResponse {
  run_id: string;
  status: string;
  output?: JsonObject | null;
  state?: JsonObject | null;
  metrics?: JsonObject | null;
}




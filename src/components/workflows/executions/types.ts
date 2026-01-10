import type { JsonObject } from '@/types/workflow-spec';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface WorkflowRunSummary {
  run_id: string;
  status: RunStatus;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  inputs?: JsonObject | null;
  output?: JsonObject | null;
  error?: string | null;
}

export interface WorkflowRunListResponse {
  workflow_id: string;
  runs: WorkflowRunSummary[];
}

export interface RunStatusResponse {
  run_id: string;
  status: RunStatus;
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

export interface WorkflowNodeTrace {
  node_id: string;
  node_type: string;
  inputs?: JsonObject | null;
  output?: unknown;
  timestamp?: string;
  output_key?: string;
  tool_name?: string;
  model?: string;
  error?: string;
}

export interface RunHistoryEntry {
  run_id: string;
  workflow_id: string | null;
  status: RunStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  inputs?: JsonObject | null;
  output?: JsonObject | null;
  nodes: WorkflowNodeTrace[];
  execution_graph?: {
    nodes: Array<{ id: string; type: string; label: string; position?: { x: number; y: number } }>;
    edges: Array<{ source: string; target: string; label?: string }>;
  };
}

export interface RunHistoryResponse {
  run_id: string;
  history: RunHistoryEntry[];
}

export interface ExecutionNavigationState {
  workflowId?: string | null;
  workflowName?: string | null;
}

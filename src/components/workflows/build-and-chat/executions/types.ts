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


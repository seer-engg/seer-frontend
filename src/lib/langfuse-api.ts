/**
 * API client for fetching traces from the traces-api backend
 */
import { backendApiClient, BackendAPIError } from "./api-client";

export interface TraceSummary {
  id: string;
  name: string;
  project: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  status: "success" | "error" | "pending";
  error: string | null;
  run_type: string;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
}

export interface RunNode {
  id: string;
  name: string;
  run_type: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  status: "success" | "error" | "pending";
  error: string | null;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  children: RunNode[];
}

export interface TraceDetail {
  id: string;
  name: string;
  project: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  status: "success" | "error" | "pending";
  error: string | null;
  run_type: string;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  children: RunNode[];
}

export interface DatasetSummary {
  id: string;
  name: string;
  description: string | null;
  data_type: string | null;
  created_at: string | null;
  modified_at: string | null;
  example_count: number | null;
  session_count: number | null;
  last_session_start_time: string | null;
}

export interface DatasetExample {
  id: string;
  created_at: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export interface ExperimentSummary {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  metadata: Record<string, unknown> | null;
  tenant_id: string | null;
}

export interface DatasetDetail extends DatasetSummary {
  inputs_schema: Record<string, unknown> | null;
  outputs_schema: Record<string, unknown> | null;
  transformations: Record<string, unknown>[] | null;
  examples: DatasetExample[];
  experiments: ExperimentSummary[];
}

export interface ListTracesParams {
  project_name?: string; // Project name for metadata filtering (e.g., 'eval-v1', 'supervisor-v1', 'codex-v1')
  limit?: number;
  start_time?: string; // ISO 8601 format
}

export interface ListDatasetsParams {
  limit?: number;
}

export interface GetDatasetDetailParams {
  exampleLimit?: number;
  experimentLimit?: number;
}

export { BackendAPIError as TracesAPIError };

export interface ProjectInfo {
  project_name: string;
}

export const tracesAPI = {
  /**
   * List all available projects (hardcoded list from backend)
   * Projects are distinguished by metadata.project_name in traces
   */
  async listProjects(): Promise<ProjectInfo[]> {
    const response = await backendApiClient.request<{ projects: ProjectInfo[] }>("/api/projects");
    return response.projects;
  },

  /**
   * List traces from a specific project (using project_name for metadata filtering)
   */
  async listTraces(params: ListTracesParams = {}): Promise<TraceSummary[]> {
    const searchParams = new URLSearchParams();
    
    if (params.project_name) {
      searchParams.append("project_name", params.project_name);
    }
    if (params.limit) {
      searchParams.append("limit", params.limit.toString());
    }
    if (params.start_time) {
      searchParams.append("start_time", params.start_time);
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/traces${queryString ? `?${queryString}` : ""}`;

    return backendApiClient.request<TraceSummary[]>(endpoint);
  },

  /**
   * Get detailed trace with nested runs
   */
  async getTraceDetail(traceId: string, projectName?: string): Promise<TraceDetail> {
    const params = projectName ? `?project_name=${encodeURIComponent(projectName)}` : "";
    return backendApiClient.request<TraceDetail>(`/api/traces/${traceId}${params}`);
  },

  /**
   * List datasets from Langfuse (via backend proxy)
   */
  async listDatasets(params: ListDatasetsParams = {}): Promise<DatasetSummary[]> {
    const searchParams = new URLSearchParams();
    if (params.limit) {
      searchParams.append("limit", params.limit.toString());
    }
    const endpoint = `/api/datasets${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return backendApiClient.request<DatasetSummary[]>(endpoint);
  },

  /**
   * Get dataset metadata, sample examples, and connected experiments
   */
  async getDatasetDetail(
    datasetId: string,
    params: GetDatasetDetailParams = {}
  ): Promise<DatasetDetail> {
    const searchParams = new URLSearchParams();
    if (params.exampleLimit) {
      searchParams.append("example_limit", params.exampleLimit.toString());
    }
    if (params.experimentLimit) {
      searchParams.append("experiment_limit", params.experimentLimit.toString());
    }
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return backendApiClient.request<DatasetDetail>(`/api/datasets/${datasetId}${suffix}`);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return backendApiClient.request<{ status: string }>("/health");
  },
};

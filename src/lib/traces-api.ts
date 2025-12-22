/**
 * API client for fetching traces from MLflow via the backend API.
 * The backend queries MLflow traces and returns them in a standardized format.
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

export interface ListTracesParams {
  project_name?: string; // Project name for metadata filtering (e.g., 'eval-v1', 'supervisor-v1', 'codex-v1')
  limit?: number;
  start_time?: string; // ISO 8601 format
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
   * Get detailed trace with nested runs from MLflow
   */
  async getTraceDetail(traceId: string, projectName?: string): Promise<TraceDetail> {
    const params = projectName ? `?project_name=${encodeURIComponent(projectName)}` : "";
    return backendApiClient.request<TraceDetail>(`/api/traces/${traceId}${params}`);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return backendApiClient.request<{ status: string }>("/health");
  },
};

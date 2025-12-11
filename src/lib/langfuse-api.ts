/**
 * API client for fetching traces from the traces-api backend
 */

// Ensure we have a proper full URL (with protocol)
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_TRACES_API_URL;
  
  if (envUrl) {
    // If it already has a protocol, use it as-is
    if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
      return envUrl;
    }
    // Otherwise, assume https for production URLs
    if (envUrl.includes("railway.app") || envUrl.includes("vercel.app") || envUrl.includes("netlify.app")) {
      return `https://${envUrl}`;
    }
    // For localhost, use http
    return `http://${envUrl}`;
  }
  
  // Default to localhost
  return "http://localhost:8080";
}

const API_BASE_URL = getApiBaseUrl();

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

class TracesAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "TracesAPIError";
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  
  // Validate URL is absolute (has protocol)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new TracesAPIError(
      `Invalid API URL: ${url}. URL must start with http:// or https://. Check VITE_TRACES_API_URL environment variable.`
    );
  }
  
  // Handle body serialization if provided
  const body = options?.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;
  const { body: _, ...restOptions } = options || {};
  
  try {
    const response = await fetch(url, {
      ...restOptions,
      body,
      headers: {
        "Content-Type": "application/json",
        ...restOptions?.headers,
      },
    });

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<!DOCTYPE") || text.includes("<html")) {
        throw new TracesAPIError(
          `Received HTML instead of JSON. This usually means the API URL is incorrect or the backend is not running.\n` +
          `Requested URL: ${url}\n` +
          `API Base URL: ${API_BASE_URL}\n` +
          `Please check VITE_TRACES_API_URL environment variable. It should be a full URL like: https://your-backend.railway.app`,
          response.status,
          { url, contentType, apiBaseUrl: API_BASE_URL }
        );
      }
    }

    if (!response.ok) {
      let errorData: { detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // If JSON parsing fails, use text
        const text = await response.text();
        errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new TracesAPIError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof TracesAPIError) {
      throw error;
    }
    throw new TracesAPIError(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export interface ProjectInfo {
  project_name: string;
}

export const tracesAPI = {
  /**
   * List all available projects (hardcoded list from backend)
   * Projects are distinguished by metadata.project_name in traces
   */
  async listProjects(): Promise<ProjectInfo[]> {
    const response = await fetchAPI<{ projects: ProjectInfo[] }>("/api/projects");
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

    return fetchAPI<TraceSummary[]>(endpoint);
  },

  /**
   * Get detailed trace with nested runs
   */
  async getTraceDetail(traceId: string, projectName?: string): Promise<TraceDetail> {
    const params = projectName ? `?project_name=${encodeURIComponent(projectName)}` : "";
    return fetchAPI<TraceDetail>(`/api/traces/${traceId}${params}`);
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
    return fetchAPI<DatasetSummary[]>(endpoint);
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
    return fetchAPI<DatasetDetail>(`/api/datasets/${datasetId}${suffix}`);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return fetchAPI<{ status: string }>("/health");
  },
};

/**
 * Get Langfuse URL for a trace
 * Note: This requires the Langfuse host URL to be configured
 */
export function getLangfuseTraceUrl(traceId: string): string {
  const langfuseHost = import.meta.env.VITE_LANGFUSE_BASE_URL || "http://localhost:3000";
  return `${langfuseHost}/traces/${traceId}`;
}

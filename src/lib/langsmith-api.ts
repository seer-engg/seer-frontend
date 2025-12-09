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
  return "http://localhost:8001";
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

export interface ListTracesParams {
  project?: "supervisor-v1" | "seer-v1";
  limit?: number;
  start_time?: string; // ISO 8601 format
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
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
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

export const tracesAPI = {
  /**
   * List traces from allowed projects
   */
  async listTraces(params: ListTracesParams = {}): Promise<TraceSummary[]> {
    const searchParams = new URLSearchParams();
    
    if (params.project) {
      searchParams.append("project", params.project);
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
  async getTraceDetail(traceId: string): Promise<TraceDetail> {
    return fetchAPI<TraceDetail>(`/api/traces/${traceId}`);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    return fetchAPI<{ status: string }>("/health");
  },
};

/**
 * Get LangSmith URL for a trace
 */
export function getLangSmithTraceUrl(traceId: string): string {
  return `https://smith.langchain.com/trace/${traceId}`;
}


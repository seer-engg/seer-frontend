export type TokenProvider = () => Promise<string | null>;
type JsonBody = Record<string, unknown> | unknown[];

interface BackendAPIClientOptions {
  baseUrl: string | (() => string);
  tokenProvider?: TokenProvider;
}

interface BackendRequestInit extends Omit<RequestInit, "body" | "headers"> {
  body?: RequestInit["body"] | JsonBody;
  headers?: HeadersInit;
}

export class BackendAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "BackendAPIError";
  }
}

const ensureAbsoluteUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.includes("localhost") || url.startsWith("127.")) {
    return `http://${url}`;
  }

  return `https://${url}`;
};

/**
 * Gets the backend base URL dynamically.
 * Checks for 'backend' query parameter first, then falls back to VITE_BACKEND_API_URL env var.
 * If neither is set, falls back to http://localhost:8000 (Docker default).
 * @returns The backend base URL
 */
export const getBackendBaseUrl = (): string => {
  // Check for backend URL in query parameter (for self-hosted backend)
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const backendParam = urlParams.get("backend");
    if (backendParam) {
      return ensureAbsoluteUrl(backendParam);
    }
  }
  
  // Fall back to environment variable
  const envUrl = import.meta.env.VITE_BACKEND_API_URL;
  if (envUrl) {
    return ensureAbsoluteUrl(envUrl);
  }
  
  // Final fallback to Docker default port (matches docker-compose.yml)
  const fallbackUrl = "http://localhost:8000";
  if (typeof window !== "undefined") {
    console.warn(
      `[BackendAPIClient] No backend URL configured. Using fallback: ${fallbackUrl}. ` +
      `Set VITE_BACKEND_API_URL or use ?backend=<url> query parameter.`
    );
  }
  return fallbackUrl;
};

const defaultTokenProvider: TokenProvider = async () => {
  if (typeof window === "undefined") {
    return null;
  }
  const clerk = (window as WindowWithClerk).Clerk;
  if (!clerk?.session?.getToken) {
    return null;
  }
  try {
    return await clerk.session.getToken({template:"user-profile"});
  } catch (error) {
    console.warn("Failed to fetch Clerk token", error);
    return null;
  }
};

export const backendTokenProvider = defaultTokenProvider;
const shouldSerializeBody = (value: unknown): value is JsonBody => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  if (value instanceof FormData || value instanceof URLSearchParams || value instanceof Blob) {
    return false;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return false;
  }

  if (typeof ReadableStream !== "undefined" && value instanceof ReadableStream) {
    return false;
  }

  return true;
};

export class BackendAPIClient {
  private baseUrl: string | (() => string);
  private tokenProvider?: TokenProvider;

  constructor(options: BackendAPIClientOptions) {
    // Support both static URL and dynamic getter function
    this.baseUrl = typeof options.baseUrl === "function" 
      ? options.baseUrl 
      : ensureAbsoluteUrl(options.baseUrl);
    this.tokenProvider = options.tokenProvider;
  }

  /**
   * Gets the current base URL, resolving it dynamically if it's a function
   */
  private getBaseUrl(): string {
    return typeof this.baseUrl === "function" 
      ? this.baseUrl() 
      : this.baseUrl;
  }

  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider;
  }

  private async getToken(): Promise<string | null> {
    const provider = this.tokenProvider ?? defaultTokenProvider;
    return provider ? provider() : null;
  }

  private toAbsoluteUrl(endpoint: string): string {
    const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.getBaseUrl()}${normalized}`;
  }

  // eslint-disable-next-line complexity
  async request<T>(endpoint: string, options: BackendRequestInit = {}): Promise<T> {
    const url = this.toAbsoluteUrl(endpoint);
    const token = await this.getToken();
    const { body: requestBody, headers: providedHeaders, ...restOptions } = options;

    let body = requestBody as RequestInit["body"] | undefined;
    if (requestBody && shouldSerializeBody(requestBody)) {
      body = JSON.stringify(requestBody);
    }

    const headers = new Headers(providedHeaders || {});
    if (!(body instanceof FormData)) {
      headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Add cache-control headers for GET requests to prevent HTTP-level caching
    if ((restOptions.method === 'GET' || !restOptions.method) && !headers.has('Cache-Control')) {
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
    }

    const response = await fetch(url, {
      ...restOptions,
      headers,
      body,
      signal: restOptions.signal, // Pass through abort signal
    });

    const contentType = response.headers.get("content-type") || "";
    const responseBody = await response.text();

    if (!response.ok) {
      let errorPayload: unknown;
      if (responseBody) {
        try {
          errorPayload = JSON.parse(responseBody);
        } catch {
          errorPayload = responseBody;
        }
      }
      const detail =
        typeof errorPayload === "object" &&
        errorPayload !== null &&
        "detail" in errorPayload &&
        typeof (errorPayload as { detail?: unknown }).detail === "string"
          ? (errorPayload as { detail: string }).detail
          : undefined;
      const message: string = detail ?? response.statusText ?? `HTTP ${response.status}`;
      throw new BackendAPIError(message, response.status, errorPayload);
    }

    if (!responseBody) {
      return undefined as T;
    }

    if (!contentType.includes("application/json")) {
      if (responseBody.trim().startsWith("<!doctype") || responseBody.includes("<html")) {
        throw new BackendAPIError(
          `Received HTML instead of JSON from ${url}. Check backend availability.`,
          response.status,
          { url, contentType },
        );
      }
      throw new BackendAPIError(
        `Unsupported content type: ${contentType || "unknown"}`,
        response.status,
        { url, contentType, body: responseBody },
      );
    }

    try {
      return JSON.parse(responseBody) as T;
    } catch (error) {
      throw new BackendAPIError(
        "Failed to parse JSON response",
        response.status,
        { url, rawBody: responseBody, error: error instanceof Error ? error.message : error },
      );
    }
  }
}

// Create client with dynamic URL resolution - reads URL from query param or env var on each request
export const backendApiClient = new BackendAPIClient({
  baseUrl: getBackendBaseUrl, // Pass function reference for dynamic resolution
});

interface WindowWithClerk extends Window {
  Clerk?: {
    session?: {
      getToken: (options?: Record<string, unknown>) => Promise<string | null>;
    };
  };
}

// ============================================================================
// Integration & Tool Execution Types and Functions
// ============================================================================

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  user_id?: string;
  toolkit: {
    slug: string;
  };
  scopes?: string;
  provider?: string;
}

export interface ListConnectedAccountsResponse {
  items: ConnectedAccount[];
  total: number;
}

/**
 * Tool connection status - indicates whether a specific tool has the required OAuth scopes
 */
export interface ToolConnectionStatus {
  tool_name: string;
  integration_type: string | null;
  provider: string | null;
  connected: boolean;
  has_required_scopes: boolean;
  access_token_valid?: boolean;  // Whether access token exists and is not expired
  has_refresh_token?: boolean;  // Whether refresh_token exists (needed for token refresh)
  missing_scopes: string[];
  connection_id: string | null;
  provider_account_id?: string;
  requires_oauth_connection?: boolean;
  requires_secrets?: boolean;
  supports_tokenless_auth?: boolean;
  auth_mode?: "none" | "oauth" | "secrets" | "oauth_and_secrets";
}

export interface ToolsConnectionStatusResponse {
  tools: ToolConnectionStatus[];
}

/**
 * Integration status - shows connection status for an integration type
 */
export interface IntegrationStatus {
  integration_type: string;
  provider: string;
  connected: boolean;
  has_required_scopes: boolean;
  granted_scopes: string[];
  missing_scopes: string[];
  connection_id: string | null;
  provider_account_id?: string;
}

export interface ConnectResponse {
  redirectUrl: string;
  connectionId: string;
}

export interface WaitForConnectionResponse {
  status: string;
  connectionId: string;
}

export interface ExecuteToolResponse {
  data: unknown;
  success: boolean;
  error?: string;
}

export interface IntegrationResource {
  id: number;
  provider: string;
  resource_type: string;
  resource_id: string;
  resource_key?: string | null;
  name?: string | null;
  status: string;
  metadata?: Record<string, unknown>;
  oauth_connection_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface IntegrationSecret {
  id: number;
  provider: string;
  name: string;
  secret_type: string;
  resource_id?: number | null;
  oauth_connection_id?: string | null;
  value_fingerprint?: string | null;
  metadata?: Record<string, unknown>;
  status: string;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupabaseBindingResponse {
  resource: IntegrationResource;
  secrets: IntegrationSecret[];
}

/**
 * List connected accounts for a user
 */
export async function listConnectedAccounts(params: {
  userIds?: string[];
  toolkitSlugs?: string[];
  authConfigIds?: string[];
}): Promise<ListConnectedAccountsResponse> {
  // Backend uses authenticated user from JWT token, so user_id query parameter is not needed
  const endpoint = `/api/integrations/`;
  const response = await backendApiClient.request<{ items: ConnectedAccount[] }>(endpoint);

  // Filter by toolkitSlugs if provided
  let items = response.items || [];
  if (params.toolkitSlugs && params.toolkitSlugs.length > 0) {
    items = items.filter((item) => params.toolkitSlugs!.includes(item.toolkit.slug));
  }

  return {
    items,
    total: items.length,
  };
}

/**
 * Get connection status for all tools.
 * This is the primary way to check which tools are connected and have required scopes.
 */
export async function getToolsConnectionStatus(): Promise<ToolsConnectionStatusResponse> {
  const endpoint = `/api/integrations/tools/status`;
  return backendApiClient.request<ToolsConnectionStatusResponse>(endpoint);
}

/**
 * Get connection status for a specific integration type.
 * Checks if the user has a connection with required scopes for all tools
 * belonging to this integration type.
 */
export async function getIntegrationStatus(integrationType: string): Promise<IntegrationStatus> {
  const endpoint = `/api/integrations/${integrationType}/status`;
  return backendApiClient.request<IntegrationStatus>(endpoint);
}

/**
 * Initiate OAuth connection
 * CRITICAL: Frontend must always pass scope parameter
 *
 * Builds OAuth redirect URL with JWT token for authentication.
 * OAuth flows require browser navigation (not fetch) because the backend
 * redirects to the OAuth provider, which doesn't allow cross-origin requests.
 * 
 * The caller should navigate using: window.location.href = response.redirectUrl
 */
export async function initiateConnection(params: {
  userId: string;
  provider: string;
  scope: string; // REQUIRED - OAuth scopes (frontend controls)
  callbackUrl?: string;
  integrationType?: string; // Integration type that triggered this (e.g., 'gmail', 'google_sheets')
}): Promise<ConnectResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append("user_id", params.userId);
  searchParams.append("scope", params.scope);

  if (params.callbackUrl) {
    searchParams.append("redirect_to", params.callbackUrl);
  }

  // Pass integration type so backend can track which tool triggered this connection
  if (params.integrationType) {
    searchParams.append("integration_type", params.integrationType);
  }

  // Include JWT token for backend authentication
  // OAuth flows require browser navigation, so we can't use Authorization header
  const token = await backendTokenProvider();
  if (token) {
    searchParams.append("token", token);
  }

  // Build full backend URL for OAuth redirect
  // The browser will navigate directly to this URL
  const backendUrl = getBackendBaseUrl();
  const redirectUrl = `${backendUrl}/api/integrations/${params.provider}/connect?${searchParams.toString()}`;

  return {
    redirectUrl,
    connectionId: "pending", // Will be set after OAuth callback
  };
}

/**
 * Wait for OAuth connection to be established
 */
export async function waitForConnection(params: {
  connectionId: string;
  timeoutMs?: number;
}): Promise<WaitForConnectionResponse> {
  // Polling logic - TODO: implement actual polling
  return { status: "ACTIVE", connectionId: params.connectionId };
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(accountId: string): Promise<void> {
  await backendApiClient.request<void>(`/api/integrations/${accountId}`, {
    method: "DELETE",
  });
}

/**
 * Execute a tool
 */
export async function executeTool(params: {
  toolSlug: string;
  userId: string;
  connectionId?: string;
  arguments?: Record<string, unknown>;
}): Promise<ExecuteToolResponse> {
  const endpoint = `/api/tools/${params.toolSlug}/execute`;

  try {
    const response = await backendApiClient.request<ExecuteToolResponse>(endpoint, {
      method: "POST",
      body: {
        user_id: params.userId,
        connection_id: params.connectionId,
        arguments: params.arguments || {},
      },
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Tool execution failed";
    return {
      success: false,
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * List persisted Supabase project bindings for the authenticated user.
 */
export async function listSupabaseBindings(params?: {
  resourceType?: string;
}): Promise<IntegrationResource[]> {
  const searchParams = new URLSearchParams();
  if (params?.resourceType) {
    searchParams.set('resource_type', params.resourceType);
  }
  const query = searchParams.toString();
  const endpoint = `/api/integrations/supabase/resources/bindings${query ? `?${query}` : ''}`;
  const response = await backendApiClient.request<{ items: IntegrationResource[] }>(endpoint);
  return response.items || [];
}

/**
 * Bind a Supabase project by project reference and optional connection ID.
 */
export async function bindSupabaseProject(params: {
  projectRef: string;
  connectionId?: string;
}): Promise<SupabaseBindingResponse> {
  return backendApiClient.request<SupabaseBindingResponse>('/api/integrations/supabase/projects/bind', {
    method: 'POST',
    body: {
      project_ref: params.projectRef,
      connection_id: params.connectionId,
    },
  });
}

/**
 * Bind a Supabase project by directly supplying secrets instead of OAuth.
 * Mirrors SupabaseManualBindRequest on the backend.
 */
export async function bindSupabaseProjectManual(params: {
  projectRef: string;
  projectName?: string;
  serviceRoleKey?: string;
  anonKey?: string;
  connectionId?: string;
}): Promise<SupabaseBindingResponse> {
  return backendApiClient.request<SupabaseBindingResponse>(
    '/api/integrations/supabase/projects/manual-bind',
    {
      method: 'POST',
      body: {
        project_ref: params.projectRef,
        project_name: params.projectName,
        service_role_key: params.serviceRoleKey,
        anon_key: params.anonKey,
        connection_id: params.connectionId,
      },
    },
  );
}

/**
 * Delete (revoke) a persisted integration resource binding.
 */
export async function deleteIntegrationResource(resourceId: number): Promise<void> {
  await backendApiClient.request(`/api/integrations/resources/${resourceId}`, {
    method: 'DELETE',
  });
}


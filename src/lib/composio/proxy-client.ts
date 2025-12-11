/**
 * Composio Proxy Client
 * Calls backend proxy API instead of Composio SDK directly (fixes CORS)
 */

const getProxyBaseUrl = (): string => {
  // Get Seer Backend URL from env or use default
  const seerBackendUrl = 
    import.meta.env.VITE_BACKEND_API_URL || "http://localhost:9000";
  
  return seerBackendUrl;
};

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  user_id?: string; // Include user_id to verify what format Composio stored
  toolkit: {
    slug: string;
  };
}

export interface ListConnectedAccountsResponse {
  items: ConnectedAccount[];
  total: number;
}

export interface ConnectResponse {
  redirectUrl: string;
  connectionId: string;
}

export interface WaitForConnectionResponse {
  status: string;
  connectedAccountId: string;
}

export interface ExecuteToolResponse {
  data: any;
  success: boolean;
}

/**
 * List connected accounts for a user
 */
export async function listConnectedAccounts(params: {
  userIds?: string[];
  toolkitSlugs?: string[];
  authConfigIds?: string[];
}): Promise<ListConnectedAccountsResponse> {
  const baseUrl = getProxyBaseUrl();
  const searchParams = new URLSearchParams();
  
  if (params.userIds) {
    params.userIds.forEach(id => searchParams.append("user_ids", id));
  }
  if (params.toolkitSlugs) {
    params.toolkitSlugs.forEach(slug => searchParams.append("toolkit_slugs", slug));
  }
  if (params.authConfigIds) {
    params.authConfigIds.forEach(id => searchParams.append("auth_config_ids", id));
  }
  
  const url = `${baseUrl}/api/composio/connected-accounts?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Initiate OAuth connection
 */
export async function initiateConnection(params: {
  userId: string;
  authConfigId: string;
  callbackUrl?: string;
}): Promise<ConnectResponse> {
  const baseUrl = getProxyBaseUrl();
  const url = `${baseUrl}/api/composio/connect`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: params.userId,
      auth_config_id: params.authConfigId,
      callback_url: params.callbackUrl,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Wait for OAuth connection to be established
 */
export async function waitForConnection(params: {
  connectionId: string;
  timeoutMs?: number;
}): Promise<WaitForConnectionResponse> {
  const baseUrl = getProxyBaseUrl();
  const url = `${baseUrl}/api/composio/wait-for-connection`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connection_id: params.connectionId,
      timeout_ms: params.timeoutMs || 120000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(accountId: string): Promise<void> {
  const baseUrl = getProxyBaseUrl();
  const url = `${baseUrl}/api/composio/connected-accounts/${accountId}`;
  
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
}

/**
 * Execute a Composio tool via backend proxy
 */
export async function executeTool(params: {
  toolSlug: string;
  userId: string;
  connectedAccountId?: string;
  arguments?: Record<string, any>;
}): Promise<ExecuteToolResponse> {
  const baseUrl = getProxyBaseUrl();
  const url = `${baseUrl}/api/composio/tools/execute/${params.toolSlug}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: params.userId,
      connected_account_id: params.connectedAccountId,
      arguments: params.arguments || {},
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.error?.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

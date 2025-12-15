/**
 * Composio Proxy Client
 * Calls backend proxy API instead of Composio SDK directly (fixes CORS)
 */
import { backendApiClient } from "@/lib/api-client";

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
  data: unknown;
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
  
  const endpoint = `/api/composio/connected-accounts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  return backendApiClient.request<ListConnectedAccountsResponse>(endpoint);
}

/**
 * Initiate OAuth connection
 */
export async function initiateConnection(params: {
  userId: string;
  authConfigId: string;
  callbackUrl?: string;
}): Promise<ConnectResponse> {
  return backendApiClient.request<ConnectResponse>("/api/composio/connect", {
    method: "POST",
    body: {
      user_id: params.userId,
      auth_config_id: params.authConfigId,
      callback_url: params.callbackUrl,
    },
  });
}

/**
 * Wait for OAuth connection to be established
 */
export async function waitForConnection(params: {
  connectionId: string;
  timeoutMs?: number;
}): Promise<WaitForConnectionResponse> {
  return backendApiClient.request<WaitForConnectionResponse>("/api/composio/wait-for-connection", {
    method: "POST",
    body: {
      connection_id: params.connectionId,
      timeout_ms: params.timeoutMs || 120000,
    },
  });
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(accountId: string): Promise<void> {
  await backendApiClient.request<void>(`/api/composio/connected-accounts/${accountId}`, {
    method: "DELETE",
  });
}

/**
 * Execute a Composio tool via backend proxy
 */
export async function executeTool(params: {
  toolSlug: string;
  userId: string;
  connectedAccountId?: string;
  arguments?: Record<string, unknown>;
}): Promise<ExecuteToolResponse> {
  return backendApiClient.request<ExecuteToolResponse>(`/api/composio/tools/execute/${params.toolSlug}`, {
    method: "POST",
    body: {
      user_id: params.userId,
      connected_account_id: params.connectedAccountId,
      arguments: params.arguments || {},
    },
  });
}

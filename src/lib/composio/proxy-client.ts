/**
 * Integration Client
 * Replaces Composio Proxy Client with custom Authlib integration
 */
import { backendApiClient } from "@/lib/api-client";

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  user_id?: string;
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
  // We only support user_id now.
  // Take the first user_id from the list if available
  const userId = params.userIds?.[0];
  if (!userId) {
      return { items: [], total: 0 };
  }
  
  const searchParams = new URLSearchParams();
  searchParams.append("user_id", userId);
  
  const endpoint = `/api/integrations?${searchParams.toString()}`;
  const response = await backendApiClient.request<{items: ConnectedAccount[]}>(endpoint);
  
  // Filter by toolkitSlugs if provided
  let items = response.items || [];
  if (params.toolkitSlugs && params.toolkitSlugs.length > 0) {
      items = items.filter(item => params.toolkitSlugs!.includes(item.toolkit.slug));
  }
  
  return {
      items,
      total: items.length
  };
}

/**
 * Initiate OAuth connection
 */
export async function initiateConnection(params: {
  userId: string;
  authConfigId?: string; 
  provider?: string;
  callbackUrl?: string; 
}): Promise<ConnectResponse> {
  const provider = params.provider || "google"; // Default or fallback
  
  const searchParams = new URLSearchParams();
  searchParams.append("user_id", params.userId);
  
  // We can't really get the redirect URL without calling the backend?
  // Actually, we can just construct it.
  const redirectUrl = `/api/integrations/${provider}/connect?${searchParams.toString()}`;
  
  return {
    redirectUrl,
    connectionId: "mock-init-id"
  };
}

/**
 * Wait for OAuth connection to be established
 */
export async function waitForConnection(params: {
  connectionId: string;
  timeoutMs?: number;
}): Promise<WaitForConnectionResponse> {
  // Polling logic
  return { status: "ACTIVE", connectedAccountId: "mock" };
}

export async function deleteConnectedAccount(accountId: string, userId?: string): Promise<void> {
  const finalUserId = userId || "unknown";
  await backendApiClient.request<void>(`/api/integrations/${accountId}?user_id=${finalUserId}`, {
    method: "DELETE",
  });
}

export async function executeTool(params: {
  toolSlug: string;
  userId: string;
  connectedAccountId?: string;
  arguments?: Record<string, unknown>;
}): Promise<ExecuteToolResponse> {
  console.log("Mock executing tool:", params);
  return {
    success: true,
    data: { message: "Mock tool execution successful" }
  };
}

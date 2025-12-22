/**
 * Tool execution and OAuth connection management client for custom tool system
 */
import { backendApiClient, getBackendBaseUrl } from "@/lib/api-client";

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
  connectionId: string;
}

export interface ExecuteToolResponse {
  data: unknown;
  success: boolean;
  error?: string;
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
 * CRITICAL: Frontend must always pass scope parameter
 * 
 * Returns full backend URL for OAuth redirect - browser navigates directly to backend
 */
export async function initiateConnection(params: {
  userId: string;
  provider: string;
  scope: string; // REQUIRED - OAuth scopes (frontend controls)
  callbackUrl?: string; 
}): Promise<ConnectResponse> {
  const provider = params.provider;
  
  const searchParams = new URLSearchParams();
  searchParams.append("user_id", params.userId);
  searchParams.append("scope", params.scope); // Always pass scope
  
  if (params.callbackUrl) {
    searchParams.append("redirect_to", params.callbackUrl);
  }
  
  // Build full backend URL for OAuth redirect
  // The browser will navigate directly to the backend OAuth endpoint
  const backendUrl = getBackendBaseUrl();
  const redirectUrl = `${backendUrl}/api/integrations/${provider}/connect?${searchParams.toString()}`;
  console.log("redirectUrl", redirectUrl);
  
  return {
    redirectUrl,
    connectionId: "init-id" // Will be set by backend after redirect
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

export async function deleteConnectedAccount(accountId: string, userId?: string): Promise<void> {
  const finalUserId = userId || "unknown";
  await backendApiClient.request<void>(`/api/integrations/${accountId}?user_id=${finalUserId}`, {
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
  } catch (error: any) {
    return {
      success: false,
      data: null,
      error: error.message || "Tool execution failed",
    };
  }
}


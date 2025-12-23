/**
 * Generic component for connecting integrations
 * Handles OAuth flow, connection status, and resource selection
 * Frontend controls OAuth scopes (read-only is core differentiation)
 */

import { IntegrationType, formatScopes } from "@/lib/integrations/client";
import { INTEGRATION_CONFIGS, ConnectionStatus, ConnectedAccount } from "@/lib/integrations/config";
import {
  listConnectedAccounts,
  initiateConnection,
  waitForConnection,
  deleteConnectedAccount,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";

const CONNECTION_QUERY_KEYS = [
  "connected_account_id", // Legacy support
  "connection_id",
  "connectedAccountId", // Legacy support
  "connected"
];

const STATUS_BADGE_STYLES: Record<ConnectionStatus, string> = {
  "unknown": "bg-muted text-muted-foreground",
  "needs-auth": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  "pending": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "connected": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "error": "bg-destructive/10 text-destructive",
};

interface IntegrationConnectProps {
  type: IntegrationType;
  onConnected?: (connectionId: string) => void;
  onResourceSelected?: (resourceId: string, resourceName: string) => void;
  children?: (props: {
    status: ConnectionStatus;
    connectionId: string | null;
    isLoading: boolean;
    onAuthorize: () => void;
    onRefresh: () => void;
    onCancel: () => void;
  }) => React.ReactNode;
}

export function IntegrationConnect({
  type,
  onConnected,
  onResourceSelected,
  children,
}: IntegrationConnectProps) {
  const { user, isLoaded } = useUser();
  const authLoading = !isLoaded;
  const { toast } = useToast();

  const config = INTEGRATION_CONFIGS[type];
  // Get required scopes for this integration
  const requiredScopes = config.requiredScopes;

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;
  const canConnect = Boolean(userEmail);
  const isSandbox = type === "sandbox";

  // Sandbox is always connected and doesn't need OAuth
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isSandbox ? "connected" : "unknown");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [authorizeLoading, setAuthorizeLoading] = useState(false);

  const resetConnectionState = useCallback(() => {
    setConnectionId(null);
    setConnectionStatus("needs-auth");
    setConnectionError(null);
  }, []);

  const fetchConnections = useCallback(async () => {
    if (!canConnect || !userEmail) {
      resetConnectionState();
      return;
    }

    setConnectionLoading(true);
    setConnectionError(null);

    try {
      const response = await listConnectedAccounts({
        userIds: [userEmail],
        toolkitSlugs: [config.toolkitSlug],
      });

      const items = response.items ?? [];
      const activeAccount = items.find((item) => item.status === "ACTIVE");

      // Clear any previous errors on successful fetch
      setConnectionError(null);

      if (activeAccount) {
        console.log(`[IntegrationConnect] Found ACTIVE account for ${type}:`, activeAccount.id);
        if (activeAccount.user_id) {
          console.log(`[IntegrationConnect] Account user_id format:`, activeAccount.user_id);
        }
        setConnectionId(activeAccount.id);
        setConnectionStatus("connected");
        // Call onConnected callback - don't include it in deps to avoid loops
        onConnected?.(activeAccount.id);
      } else if (items.length) {
        console.log(`[IntegrationConnect] Found ${items.length} account(s) but none ACTIVE for ${type}`);
        setConnectionId(items[0].id);
        setConnectionStatus("pending");
      } else {
        console.log(`[IntegrationConnect] No accounts found for ${type}`);
        resetConnectionState();
      }
    } catch (error) {
      console.error("[IntegrationConnect] Error fetching connections:", error);
      setConnectionStatus("error");
      setConnectionError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setConnectionLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConnect, config.toolkitSlug, resetConnectionState, userEmail]);

  const handleAuthorize = useCallback(async () => {
    if (!userEmail) return;
    
    // CRITICAL: Frontend must always pass scopes
    if (requiredScopes.length === 0 && !isSandbox) {
      toast({
        title: "Configuration error",
        description: `No OAuth scopes configured for ${config.displayName}`,
        variant: "destructive",
      });
      return;
    }
    
    setAuthorizeLoading(true);
    setConnectionError(null);

    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const scopeString = formatScopes(requiredScopes);
      
      const connectionRequest = await initiateConnection({
        userId: userEmail,
        provider: type,
        scope: scopeString, // Always pass scopes - frontend controls permissions
        callbackUrl,
      });

      if (!connectionRequest.redirectUrl) {
        throw new Error("Backend did not return a redirect URL");
      }

      window.location.href = connectionRequest.redirectUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setConnectionStatus("error");
      setConnectionError(message);
      toast({
        title: `${config.displayName} authorization failed`,
        description: message,
        variant: "destructive",
      });
    } finally {
      setAuthorizeLoading(false);
    }
  }, [toast, userEmail, config.displayName, type, requiredScopes, isSandbox]);

  const handleCancel = useCallback(async () => {
    if (!connectionId) return;
    
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      await deleteConnectedAccount(connectionId, userEmail || undefined);
      toast({
        title: `${config.displayName} connection cancelled`,
        description: "The pending connection has been cancelled. You can connect again anytime.",
      });
      resetConnectionState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setConnectionError(message);
      toast({
        title: "Failed to cancel connection",
        description: message,
        variant: "destructive",
      });
    } finally {
      setConnectionLoading(false);
    }
  }, [connectionId, toast, config.displayName, resetConnectionState, userEmail]);

  useEffect(() => {
    // Sandbox is always connected, no need to fetch
    if (isSandbox) {
      setConnectionStatus("connected");
      setConnectionLoading(false);
      return;
    }

    if (!userEmail) {
      resetConnectionState();
      return;
    }

    if (canConnect && !authLoading) {
      fetchConnections();
    }
    // Only re-fetch when these core dependencies change, not when fetchConnections callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canConnect, userEmail, isSandbox]);

  // Handle OAuth callback - use a ref to prevent re-running
  useEffect(() => {
    if (!canConnect) return;

    const params = new URLSearchParams(window.location.search);
    const matchedValue = CONNECTION_QUERY_KEYS.map((key) => params.get(key)).find(Boolean);
    if (!matchedValue) return;

    // Prevent processing the same callback multiple times
    const processingKey = `oauth_processing_${type}_${matchedValue}`;
    if (sessionStorage.getItem(processingKey)) {
      return;
    }
    sessionStorage.setItem(processingKey, "true");

    const cleanQueryParams = () => {
      let mutated = false;
      CONNECTION_QUERY_KEYS.forEach((key) => {
        if (params.has(key)) {
          params.delete(key);
          mutated = true;
        }
      });
      if (mutated) {
        const queryString = params.toString();
        const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
        window.history.replaceState({}, "", newUrl);
      }
    };

    (async () => {
      try {
        setConnectionStatus("pending");
        setConnectionError(null);
        const result = await waitForConnection({
          connectionId: matchedValue,
          timeoutMs: 120000,
        });
        
        // Store the connection ID
        if (result.connectionId) {
          setConnectionId(result.connectionId);
          setConnectionStatus("connected");
          onConnected?.(result.connectionId);
          toast({
            title: `${config.displayName} connected`,
            description: "Authorization confirmed.",
          });
        }
        // Refresh connections to get latest status
        await fetchConnections();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setConnectionStatus("error");
        setConnectionError(message);
        toast({
          title: "Connection not ready",
          description: message,
          variant: "destructive",
        });
        // Still try to fetch in case it's just a timeout
        fetchConnections();
      } finally {
        cleanQueryParams();
        sessionStorage.removeItem(processingKey);
      }
    })();
    // Only depend on canConnect - don't include callbacks to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConnect]);

  // Render using children function if provided
  if (children) {
    return (
      <>
        {children({
          status: connectionStatus,
          connectionId,
          isLoading: connectionLoading || authorizeLoading,
          onAuthorize: handleAuthorize,
          onRefresh: fetchConnections,
          onCancel: handleCancel,
        })}
      </>
    );
  }

  // Default render (for backward compatibility or simple cases)
  const renderStatusBadge = () => (
    <Badge className={`flex items-center gap-1 text-xs ${STATUS_BADGE_STYLES[connectionStatus]}`}>
      {connectionStatus === "connected" && <CheckCircle2 className="h-3 w-3" />}
      {connectionStatus === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
      {connectionStatus === "needs-auth" && <AlertTriangle className="h-3 w-3" />}
      {connectionStatus === "error" && <AlertTriangle className="h-3 w-3" />}
      {connectionStatus === "unknown" && <Loader2 className="h-3 w-3 animate-spin" />}
      <span className="capitalize">{connectionStatus.replace("-", " ")}</span>
    </Badge>
  );

  return (
    <div className="flex items-center gap-2">
      <config.icon className="h-4 w-4" />
      <span className="text-sm">{config.displayName}</span>
      {renderStatusBadge()}
      {connectionStatus === "needs-auth" && (
        <Button size="sm" onClick={handleAuthorize} disabled={authorizeLoading}>
          {authorizeLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Connect
        </Button>
      )}
      {connectionStatus === "pending" && (
        <Button size="sm" variant="outline" onClick={fetchConnections} disabled={connectionLoading}>
          <RefreshCcw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      )}
    </div>
  );
}


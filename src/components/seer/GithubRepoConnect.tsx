import { useAuth } from "@/contexts/AuthContext";
import { getComposioClient, getGithubAuthConfigId } from "@/lib/composio/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle2, ExternalLink, Github, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type GithubRepo = {
  id: number | string;
  name: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  private?: boolean;
  owner?: {
    login?: string;
  };
  updated_at?: string;
};

type ConnectionStatus = "unknown" | "needs-auth" | "pending" | "connected" | "error";

const CONNECTION_QUERY_KEYS = [
  "connected_account_id",
  "connection_id",
  "composio_connected_account_id",
  "connectedAccountId",
];

const STATUS_BADGE_STYLES: Record<ConnectionStatus, string> = {
  "unknown": "bg-muted text-muted-foreground",
  "needs-auth": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  "pending": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "connected": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "error": "bg-destructive/10 text-destructive",
};

function extractRepos(payload: unknown): GithubRepo[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload as GithubRepo[];
  }

  const possibleKeys = ["repositories", "repos", "items", "data", "result", "results", "payload"];
  for (const key of possibleKeys) {
    if (typeof payload === "object" && payload !== null && key in payload) {
      const value = (payload as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value as GithubRepo[];
      }

      if (value && typeof value === "object" && "items" in (value as Record<string, unknown>)) {
        const nestedItems = (value as Record<string, unknown>).items;
        if (Array.isArray(nestedItems)) {
          return nestedItems as GithubRepo[];
        }
      }
    }
  }

  return [];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unexpected error";
}

export function GithubRepoConnect() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const composioClient = useMemo(() => getComposioClient(), []);
  const githubAuthConfigId = useMemo(() => getGithubAuthConfigId(), []);

  const missingApiKey = !import.meta.env.VITE_COMPOSIO_API_KEY;
  const missingAuthConfig = !import.meta.env.VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID;
  const canUseComposio = Boolean(composioClient && githubAuthConfigId && !missingApiKey && !missingAuthConfig);

  const userEmail = user?.email ?? null;

  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("unknown");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [authorizeLoading, setAuthorizeLoading] = useState(false);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  const selectedRepo = useMemo(() => {
    if (!selectedRepoId) return null;
    return repos.find(
      (repo) => String(repo.id ?? repo.full_name ?? repo.name) === selectedRepoId,
    ) ?? null;
  }, [repos, selectedRepoId]);

  const resetConnectionState = useCallback(() => {
    setConnectedAccountId(null);
    setConnectionStatus("needs-auth");
    setRepos([]);
    setSelectedRepoId("");
  }, []);

  const fetchConnections = useCallback(async () => {
    if (!canUseComposio || !userEmail) {
      resetConnectionState();
      return;
    }

    setConnectionLoading(true);
    setConnectionError(null);

    try {
      const response = await composioClient!.connectedAccounts.list({
        userIds: [userEmail],
        toolkitSlugs: ["github"],
        authConfigIds: githubAuthConfigId ? [githubAuthConfigId] : undefined,
      });

      const items = response.items ?? [];
      const activeAccount = items.find((item) => item.status === "ACTIVE");

      if (activeAccount) {
        setConnectedAccountId(activeAccount.id);
        setConnectionStatus("connected");
      } else if (items.length) {
        setConnectedAccountId(items[0].id);
        setConnectionStatus("pending");
      } else {
        resetConnectionState();
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(getErrorMessage(error));
    } finally {
      setConnectionLoading(false);
    }
  }, [canUseComposio, composioClient, githubAuthConfigId, resetConnectionState, userEmail]);

  const fetchRepositories = useCallback(async () => {
    if (!composioClient || !connectedAccountId || !userEmail) return;

    setReposLoading(true);
    setRepoError(null);

    try {
      const response = await composioClient.tools.execute("GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER", {
        userId: userEmail,
        connectedAccountId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          per_page: 50,
          sort: "updated",
        },
      });

      const normalized = extractRepos(response.data);
      setRepos(normalized);
      setSelectedRepoId(normalized.length ? String(normalized[0].id ?? normalized[0].full_name ?? normalized[0].name) : "");
    } catch (error) {
      const message = getErrorMessage(error);
      setRepoError(message);
      toast({
        title: "Unable to load repositories",
        description: message,
        variant: "destructive",
      });
    } finally {
      setReposLoading(false);
    }
  }, [composioClient, connectedAccountId, toast, userEmail]);

  const handleAuthorize = useCallback(async () => {
    if (!composioClient || !githubAuthConfigId || !userEmail) return;
    setAuthorizeLoading(true);
    setConnectionError(null);

    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const connectionRequest = await composioClient.connectedAccounts.link(userEmail, githubAuthConfigId, {
        callbackUrl,
      });

      if (!connectionRequest.redirectUrl) {
        throw new Error("Composio did not return a redirect URL");
      }

      window.location.href = connectionRequest.redirectUrl;
    } catch (error) {
      const message = getErrorMessage(error);
      setConnectionStatus("error");
      setConnectionError(message);
      toast({
        title: "GitHub authorization failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAuthorizeLoading(false);
    }
  }, [composioClient, githubAuthConfigId, toast, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      resetConnectionState();
      return;
    }

    if (canUseComposio && !authLoading) {
      fetchConnections();
    }
  }, [authLoading, canUseComposio, fetchConnections, resetConnectionState, userEmail]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      fetchRepositories();
    } else {
      setRepos([]);
      setSelectedRepoId("");
    }
  }, [connectionStatus, fetchRepositories]);

  useEffect(() => {
    if (!canUseComposio) return;

    const params = new URLSearchParams(window.location.search);
    const matchedValue = CONNECTION_QUERY_KEYS.map((key) => params.get(key)).find(Boolean);
    if (!matchedValue) return;

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
        await composioClient?.connectedAccounts.waitForConnection(matchedValue, 120000);
        toast({
          title: "GitHub connected",
          description: "Composio confirmed the authorization.",
        });
      } catch (error) {
        const message = getErrorMessage(error);
        toast({
          title: "Connection not ready",
          description: message,
          variant: "destructive",
        });
      } finally {
        cleanQueryParams();
        fetchConnections();
      }
    })();
  }, [canUseComposio, composioClient, fetchConnections, toast]);

  const renderStatusBadge = () => (
    <Badge className={cn("flex items-center gap-1 text-xs", STATUS_BADGE_STYLES[connectionStatus])}>
      {connectionStatus === "connected" && <CheckCircle2 className="h-3 w-3" />}
      {connectionStatus === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
      {connectionStatus === "needs-auth" && <AlertTriangle className="h-3 w-3" />}
      {connectionStatus === "error" && <AlertTriangle className="h-3 w-3" />}
      {connectionStatus === "unknown" && <Loader2 className="h-3 w-3 animate-spin" />}
      <span className="capitalize">{connectionStatus.replace("-", " ")}</span>
    </Badge>
  );

  return (
    <Card className="mx-8 my-6 border border-dashed border-seer/30 bg-card/70 backdrop-blur">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Connect GitHub with Composio</h2>
                <p className="text-sm text-muted-foreground">
                  We use your Supabase email as the Composio user identifier.
                </p>
              </div>
            </div>
            {renderStatusBadge()}
          </div>
          {userEmail && (
            <Badge variant="outline" className="w-fit">
              {userEmail}
            </Badge>
          )}
        </div>

        {!userEmail && (
          <div className="rounded-lg border border-dashed border-border/80 bg-background/40 p-6 text-sm text-muted-foreground">
            Sign in to your account to link GitHub.
          </div>
        )}

        {userEmail && (missingApiKey || missingAuthConfig) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Missing Composio configuration. Please set {missingApiKey && <code className="mx-1">VITE_COMPOSIO_API_KEY</code>}
            {missingApiKey && missingAuthConfig && " and "}
            {missingAuthConfig && <code className="mx-1">VITE_COMPOSIO_GITHUB_AUTH_CONFIG_ID</code>} in your environment.
          </div>
        )}

        {userEmail && canUseComposio && (
          <>
            {connectionStatus === "needs-auth" && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                <p>
                  Authorize Composio to access your GitHub repositories. The authorization window opens in GitHub and
                  redirects you back here when completed.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAuthorize} disabled={authorizeLoading}>
                    {authorizeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Authorize GitHub
                  </Button>
                  <Button variant="outline" onClick={fetchConnections} disabled={connectionLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Recheck
                  </Button>
                </div>
              </div>
            )}

            {connectionStatus === "pending" && (
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p>
                  Waiting for GitHub authorization to finish. Complete the OAuth flow in the popup window, or click refresh
                  once done.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={fetchConnections} disabled={connectionLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              </div>
            )}

            {connectionStatus === "connected" && (
              <div className="flex flex-col gap-6 rounded-lg border border-border/70 bg-muted/10 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground">Select a repository to work with:</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={fetchConnections} disabled={connectionLoading}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh connection
                    </Button>
                    <Button size="sm" variant="outline" onClick={fetchRepositories} disabled={reposLoading}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Sync repos
                    </Button>
                  </div>
                </div>

                {repoError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {repoError}
                  </div>
                )}

                {reposLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading repositories from GitHub
                  </div>
                )}

                {!reposLoading && !repos.length && (
                  <p className="text-sm text-muted-foreground">No repositories found for this GitHub account.</p>
                )}

                {!!repos.length && (
                  <div className="flex flex-col gap-4">
                    <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                      <SelectTrigger className="w-full text-left">
                        <SelectValue placeholder="Select a repository" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {repos.map((repo) => {
                          const value = String(repo.id ?? repo.full_name ?? repo.name);
                          return (
                            <SelectItem key={value} value={value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{repo.full_name ?? repo.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {repo.private ? "Private" : "Public"}
                                  {repo.owner?.login ? ` · ${repo.owner.login}` : ""}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {selectedRepo && (
                      <div className="rounded-lg border border-border/80 bg-background/60 p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{selectedRepo.full_name ?? selectedRepo.name}</h3>
                            <Badge variant="outline">{selectedRepo.private ? "Private" : "Public"}</Badge>
                          </div>
                          {selectedRepo.description && (
                            <p className="text-sm text-muted-foreground">{selectedRepo.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {selectedRepo.owner?.login && <span>@{selectedRepo.owner.login}</span>}
                            {selectedRepo.updated_at && <span>Updated {new Date(selectedRepo.updated_at).toLocaleString()}</span>}
                          </div>
                          <div className="flex gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={
                                  selectedRepo.html_url ??
                                  `https://github.com/${selectedRepo.full_name ?? selectedRepo.name}`
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open on GitHub
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {connectionStatus === "error" && connectionError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="space-y-2">
                  <p>{connectionError}</p>
                  <Button size="sm" variant="outline" onClick={fetchConnections}>
                    Try again
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}


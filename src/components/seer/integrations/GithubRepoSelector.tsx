/**
 * Resource selector for GitHub repositories
 */

import { executeTool } from "@/lib/composio/proxy-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";

export type GithubRepo = {
  id: number | string;
  name: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  private?: boolean;
  default_branch?: string | null;
  owner?: {
    login?: string;
  };
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

interface GithubRepoSelectorProps {
  connectedAccountId: string;
  onRepoSelected?: (repoId: string, repoName: string) => void;
  onRepoResolved?: (repo: GithubRepo) => void;
}

export function GithubRepoSelector({ connectedAccountId, onRepoSelected, onRepoResolved }: GithubRepoSelectorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;
  const onRepoSelectedRef = useRef(onRepoSelected);
  const onRepoResolvedRef = useRef(onRepoResolved);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  // Keep latest callback without recreating fetchRepositories (prevents infinite refetch loop)
  useEffect(() => {
    onRepoSelectedRef.current = onRepoSelected;
  }, [onRepoSelected]);
  useEffect(() => {
    onRepoResolvedRef.current = onRepoResolved;
  }, [onRepoResolved]);

  const fetchRepositories = useCallback(async () => {
    if (!connectedAccountId || !userEmail) return;

    setReposLoading(true);
    setRepoError(null);

    try {
      const response = await executeTool({
        toolSlug: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
        userId: userEmail,
        connectedAccountId,
        arguments: {
          per_page: 50,
          sort: "updated",
        },
      });

      const normalized = extractRepos(response.data);
      setRepos(normalized);
      if (normalized.length > 0) {
        const firstRepo = normalized[0];
        const firstRepoId = String(firstRepo.id ?? firstRepo.full_name ?? firstRepo.name);
        setSelectedRepoId(firstRepoId);
        onRepoSelectedRef.current?.(firstRepoId, firstRepo.full_name ?? firstRepo.name);
        onRepoResolvedRef.current?.(firstRepo);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setRepoError(message);
      toast({
        title: "Unable to load repositories",
        description: message,
        variant: "destructive",
      });
    } finally {
      setReposLoading(false);
    }
  }, [connectedAccountId, toast, userEmail]);

  useEffect(() => {
    if (connectedAccountId) {
      fetchRepositories();
    }
  }, [connectedAccountId, fetchRepositories]);

  const selectedRepo = repos.find(
    (repo) => String(repo.id ?? repo.full_name ?? repo.name) === selectedRepoId,
  ) ?? null;

  if (repoError) {
    return (
      <div className="text-xs text-destructive">
        {repoError}
        <Button size="sm" variant="ghost" onClick={fetchRepositories} disabled={reposLoading} className="ml-2">
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (reposLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading repositories...
      </div>
    );
  }

  if (!repos.length) {
    return <div className="text-xs text-muted-foreground">No repositories found</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedRepoId}
        onValueChange={(value) => {
          setSelectedRepoId(value);
          const repo = repos.find((r) => String(r.id ?? r.full_name ?? r.name) === value);
          if (repo) {
            onRepoSelectedRef.current?.(value, repo.full_name ?? repo.name);
            onRepoResolvedRef.current?.(repo);
          }
        }}
      >
        <SelectTrigger className="h-7 text-xs w-[200px]">
          <SelectValue placeholder="Select repository" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {repos.map((repo) => {
            const value = String(repo.id ?? repo.full_name ?? repo.name);
            return (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{repo.full_name ?? repo.name}</span>
                  {repo.owner?.login && (
                    <span className="text-xs text-muted-foreground">@{repo.owner.login}</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" onClick={fetchRepositories} disabled={reposLoading}>
        <RefreshCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}


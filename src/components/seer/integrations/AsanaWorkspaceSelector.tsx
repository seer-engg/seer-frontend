/**
 * Resource selector for Asana workspaces and projects
 */

import { executeTool } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

type AsanaWorkspace = {
  gid: string;
  name: string;
};

type AsanaProject = {
  gid: string;
  name: string;
  workspace?: {
    gid: string;
    name: string;
  };
};

interface AsanaWorkspaceSelectorProps {
  connectionId: string;
  onWorkspaceSelected?: (workspaceGid: string, workspaceName: string) => void;
  onProjectSelected?: (projectGid: string, projectName: string, workspaceGid?: string) => void;
  initialWorkspaceGid?: string; // Persisted workspace GID from previous selection
  initialProjectGid?: string; // Persisted project GID from previous selection
}

export function AsanaWorkspaceSelector({
  connectionId,
  onWorkspaceSelected,
  onProjectSelected,
  initialWorkspaceGid,
  initialProjectGid,
}: AsanaWorkspaceSelectorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const [workspaces, setWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  // Initialize from persisted selection if available
  const [selectedWorkspaceGid, setSelectedWorkspaceGid] = useState<string>(initialWorkspaceGid || "");
  const [selectedProjectGid, setSelectedProjectGid] = useState<string>(initialProjectGid || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!connectionId || !userEmail) return;

    setLoading(true);
    setError(null);

    try {
      const response = await executeTool({
        toolSlug: "ASANA_GET_MULTIPLE_WORKSPACES",
        userId: userEmail,
        connectionId,
        arguments: {},
      });

      const data = response.data;
      // Handle different response structures
      let workspacesList: any[] = [];
      if (Array.isArray(data)) {
        workspacesList = data;
      } else if (data && typeof data === "object" && "data" in data && Array.isArray((data as any).data)) {
        workspacesList = (data as any).data;
      } else if (data && typeof data === "object" && "workspaces" in data && Array.isArray((data as any).workspaces)) {
        workspacesList = (data as any).workspaces;
      }

      if (workspacesList.length > 0) {
        const normalized = workspacesList.map((w: any) => ({
          gid: w.gid || w.id,
          name: w.name || "Unnamed Workspace",
        }));
        setWorkspaces(normalized);
        if (normalized.length > 0) {
          // Check if we have a persisted workspace GID (from props or state)
          const persistedGid = initialWorkspaceGid || selectedWorkspaceGid;
          const workspaceToSelect = normalized.find(w => w.gid === persistedGid) || normalized[0];
          
          // Only auto-select if no workspace is currently selected (neither from props nor state)
          if (!persistedGid) {
            setSelectedWorkspaceGid(workspaceToSelect.gid);
            console.log(`[AsanaWorkspaceSelector] Auto-selecting first workspace: gid=${workspaceToSelect.gid}, name=${workspaceToSelect.name}`);
            onWorkspaceSelected?.(workspaceToSelect.gid, workspaceToSelect.name);
            console.log(`[AsanaWorkspaceSelector] Called onWorkspaceSelected callback`);
          } else {
            // Use persisted workspace - update state if needed
            if (workspaceToSelect.gid !== selectedWorkspaceGid) {
              setSelectedWorkspaceGid(workspaceToSelect.gid);
            }
            console.log(`[AsanaWorkspaceSelector] Using persisted workspace: gid=${workspaceToSelect.gid}, name=${workspaceToSelect.name}`);
            // Still call callback to ensure parent knows about the selection
            onWorkspaceSelected?.(workspaceToSelect.gid, workspaceToSelect.name);
          }
          
          // Fetch projects for selected workspace
          await fetchProjects(workspaceToSelect.gid);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(message);
      toast({
        title: "Unable to load workspaces",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [connectionId, toast, userEmail, onWorkspaceSelected]);

  const fetchProjects = useCallback(
    async (workspaceGid: string) => {
      if (!connectionId || !userEmail) return;

      setLoading(true);
      try {
        const response = await executeTool({
          toolSlug: "ASANA_GET_WORKSPACE_PROJECTS",
          userId: userEmail,
          connectionId,
          arguments: {
            workspace_gid: workspaceGid,
            limit: 50,
          },
        });

        const data = response.data;
        if (data && Array.isArray(data)) {
          const normalized = data.map((p: any) => ({
            gid: p.gid || p.id,
            name: p.name || "Unnamed Project",
            workspace: { gid: workspaceGid, name: "" },
          }));
          setProjects(normalized);
          if (normalized.length > 0) {
            const firstProject = normalized[0];
            setSelectedProjectGid(firstProject.gid);
            onProjectSelected?.(firstProject.gid, firstProject.name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // Don't show error toast for projects, just log it
      } finally {
        setLoading(false);
      }
    },
    [connectionId, userEmail, onProjectSelected],
  );

  // Initialize from persisted selection if available
  useEffect(() => {
    if (initialWorkspaceGid && !selectedWorkspaceGid) {
      setSelectedWorkspaceGid(initialWorkspaceGid);
    }
    if (initialProjectGid && !selectedProjectGid) {
      setSelectedProjectGid(initialProjectGid);
    }
  }, [initialWorkspaceGid, initialProjectGid]);

  useEffect(() => {
    if (connectionId) {
      fetchWorkspaces();
    }
  }, [connectionId, fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceGid) {
      fetchProjects(selectedWorkspaceGid);
    }
  }, [selectedWorkspaceGid, fetchProjects]);

  if (error) {
    return (
      <div className="text-xs text-destructive">
        {error}
        <Button size="sm" variant="ghost" onClick={fetchWorkspaces} disabled={loading} className="ml-2">
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (loading && workspaces.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading workspaces...
      </div>
    );
  }

  if (!workspaces.length) {
    return <div className="text-xs text-muted-foreground">No workspaces found</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedWorkspaceGid}
          onValueChange={(value) => {
            setSelectedWorkspaceGid(value);
            const workspace = workspaces.find((w) => w.gid === value);
            if (workspace) {
              onWorkspaceSelected?.(value, workspace.name);
              setSelectedProjectGid(""); // Reset project selection
              fetchProjects(value);
            }
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[180px]">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.gid} value={workspace.gid}>
                <span className="text-xs">{workspace.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={fetchWorkspaces} disabled={loading}>
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>

      {selectedWorkspaceGid && projects.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectGid}
            onValueChange={(value) => {
              setSelectedProjectGid(value);
              const project = projects.find((p) => p.gid === value);
              if (project) {
                onProjectSelected?.(value, project.name, selectedWorkspaceGid);
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs w-[180px]">
              <SelectValue placeholder="Select project (optional)" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {projects.map((project) => (
                <SelectItem key={project.gid} value={project.gid}>
                  <span className="text-xs">{project.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}


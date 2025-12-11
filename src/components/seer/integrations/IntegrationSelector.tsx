/**
 * Compact integration selector component for chat area
 * ChatGPT-style dropdown using Command component
 */

import { IntegrationConnect } from "./IntegrationConnect";
import { GithubRepoSelector } from "./GithubRepoSelector";
import { GoogleDriveFolderSelector } from "./GoogleDriveFolderSelector";
import { AsanaWorkspaceSelector } from "./AsanaWorkspaceSelector";
import { INTEGRATION_CONFIGS } from "@/lib/composio/integrations";
import type { IntegrationType } from "@/lib/composio/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, ChevronDown, Loader2, AlertTriangle, RefreshCcw, XCircle, Link, Check, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useIntegrationContext } from "@/contexts/IntegrationContext";

const INTEGRATION_ORDER: IntegrationType[] = ["github", "googledrive", "asana"];

export function IntegrationSelector() {
  const [open, setOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);
  const { selection: selectedResources, updateSelection } = useIntegrationContext();
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  // Check localStorage for first open
  useEffect(() => {
    const opened = localStorage.getItem("seer_integrations_opened");
    if (opened === "true") {
      setHasOpenedOnce(true);
    }
  }, []);

  // Mark as opened when dropdown opens
  useEffect(() => {
    if (open && !hasOpenedOnce) {
      setHasOpenedOnce(true);
      localStorage.setItem("seer_integrations_opened", "true");
    }
  }, [open, hasOpenedOnce]);

  const handleResourceSelected =
    (type: IntegrationType) => (id: string, name: string, extraData?: { workspaceGid?: string; projectGid?: string }) => {
      // CRITICAL: Preserve the Composio connected_account_id when selecting resources
      // The 'id' parameter here is usually a resource ID (workspace GID, repo ID, etc.), NOT the connected_account_id
      const current = selectedResources[type];
      
      // Check if 'id' looks like a Composio connected_account_id (starts with 'ca_')
      const isComposioAccountId = id.startsWith('ca_');
      
      // Determine the correct connected_account_id to use
      let connectedAccountId: string;
      if (isComposioAccountId) {
        // The 'id' parameter IS a connected_account_id, use it
        connectedAccountId = id;
      } else {
        // The 'id' parameter is a resource ID (workspace GID, etc.)
        // Use existing connected_account_id from current selection, or fallback to id if none exists
        // BUT: if current?.id also doesn't start with 'ca_', we need to find the actual connected_account_id
        if (current?.id && current.id.startsWith('ca_')) {
          connectedAccountId = current.id; // Preserve existing connected_account_id
        } else {
          // No valid connected_account_id found - this shouldn't happen, but use id as fallback
          console.warn(`[IntegrationSelector] No connected_account_id found for ${type}, using id: ${id}`);
          connectedAccountId = id;
        }
      }
      
      updateSelection(type, {
        id: connectedAccountId, // Always use the connected_account_id
        name,
        mode: current?.mode || "connected",
        // Store resource-specific IDs separately
        ...(type === "asana" && extraData?.workspaceGid && { workspaceGid: extraData.workspaceGid }),
        ...(type === "asana" && extraData?.projectGid && { projectGid: extraData.projectGid }),
      });
    };

  const handleConnected = useCallback((type: IntegrationType, connectedAccountId: string) => {
    // Store connected account ID in IntegrationContext
    // The ID is the Composio connected_account_id
    console.log(`[IntegrationSelector] handleConnected called for ${type} with account ID: ${connectedAccountId}`);
    const current = selectedResources[type];
    // Preserve existing resource IDs (workspaceGid, projectGid, etc.) if they exist
    updateSelection(type, {
      id: connectedAccountId,
      name: current?.name || "", // Preserve existing name if set, otherwise empty
      mode: "connected",
      // Preserve all resource IDs
      ...(current?.workspaceGid && { workspaceGid: current.workspaceGid }),
      ...(current?.projectGid && { projectGid: current.projectGid }),
      ...(current?.repoId && { repoId: current.repoId }),
      ...(current?.folderId && { folderId: current.folderId }),
    });
    console.log(`[IntegrationSelector] Updated selection for ${type}:`, { id: connectedAccountId, mode: "connected", preserved: current });
  }, [updateSelection, selectedResources]);

  const handleUseSandbox = useCallback((type: IntegrationType) => {
    // Set integration to use sandbox mode
    updateSelection(type, {
      id: "sandbox",
      name: "Sandbox",
      mode: "sandbox",
    });
  }, [updateSelection]);

  const handleIntegrationSelect = (type: IntegrationType) => {
    setSelectedIntegration(type);
    // Don't close dropdown - allow users to see details
  };

  const totalIntegrations = INTEGRATION_ORDER.length;

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 text-xs gap-2 border-border/50 bg-background/50 relative",
              "hover:bg-background hover:border-seer/50"
            )}
          >
            <span className="text-muted-foreground">Integrations</span>
            <ChevronDown className="h-3 w-3" />
            {/* Notification badge - disappears after first open */}
            {!hasOpenedOnce && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 border-2 border-background" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandList>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Connected Services</h3>
                  <Badge variant="secondary" className="text-xs">
                    {totalIntegrations}
                  </Badge>
                </div>
              </div>
              
              <CommandGroup>
                {INTEGRATION_ORDER.map((type) => (
                  <IntegrationCommandItem
                    key={type}
                    type={type}
                    isSelected={selectedIntegration === type}
                    onSelect={() => handleIntegrationSelect(type)}
                    onResourceSelected={handleResourceSelected(type)}
                    onConnected={(connectedAccountId) => handleConnected(type, connectedAccountId)}
                    onUseSandbox={() => handleUseSandbox(type)}
                    selectedResource={selectedResources[type]}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

interface IntegrationCommandItemProps {
  type: IntegrationType;
  isSelected: boolean;
  onSelect: () => void;
  onResourceSelected: (id: string, name: string) => void;
  onUseSandbox: () => void;
  selectedResource: { id: string; name: string } | null;
}

function IntegrationCommandItem({
  type,
  isSelected,
  onSelect,
  onResourceSelected,
  onConnected,
  onUseSandbox,
  selectedResource,
}: IntegrationCommandItemProps) {
  const config = INTEGRATION_CONFIGS[type];
  const isSandboxMode = selectedResource?.id === "sandbox" || selectedResource?.mode === "sandbox";

  return (
    <IntegrationConnect 
      type={type}
      onConnected={onConnected}
    >
      {({ status, connectedAccountId, isLoading, onAuthorize, onRefresh, onCancel }) => (
        <div className="space-y-1">
          <CommandItem
            onSelect={onSelect}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              isSelected && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <config.icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate">{config.displayName}</span>
              {isSandboxMode && (
                <Badge variant="outline" className="text-xs bg-seer/10 text-seer border-seer/20 ml-auto">
                  Sandbox
                </Badge>
              )}
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-seer ml-2 shrink-0" />
            )}
          </CommandItem>

          {/* Show details when selected */}
          {isSelected && (
            <div className="px-2 pb-2 space-y-2 ml-6">
              {/* Status badge and actions */}
              <div className="flex items-center gap-2">
                {status === "connected" && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {status === "pending" && (
                  <>
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Pending
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefresh();
                          }}
                          disabled={isLoading}
                          className="h-6 w-6"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Refresh</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                          }}
                          disabled={isLoading}
                          className="h-6 w-6 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Cancel</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {status === "needs-auth" && (
                  <>
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAuthorize();
                          }}
                          disabled={isLoading}
                          className="h-6 w-6"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Link className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Connect</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {status === "unknown" && (
                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
                {status === "error" && (
                  <>
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefresh();
                          }}
                          disabled={isLoading}
                          className="h-6 w-6"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCcw className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Retry</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>

              {/* Use Sandbox Option */}
              {!isSandboxMode && (
                <div className="px-2 pb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUseSandbox();
                        }}
                        className="w-full text-xs h-7 bg-seer/5 hover:bg-seer/10 border-seer/20 text-seer"
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Use Sandbox
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Use Seer's sandboxed {config.displayName} integration to explore the platform without connecting your account.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Resource Selection */}
              {status === "connected" && connectedAccountId && !isSandboxMode && (
                <div className="space-y-2">
                  {type === "github" && (
                    <GithubRepoSelector
                      connectedAccountId={connectedAccountId}
                      onRepoSelected={onResourceSelected}
                    />
                  )}
                  {type === "googledrive" && (
                    <GoogleDriveFolderSelector
                      connectedAccountId={connectedAccountId}
                      onFolderSelected={onResourceSelected}
                    />
                  )}
                  {type === "asana" && (
                    <AsanaWorkspaceSelector
                      connectedAccountId={connectedAccountId}
                      initialWorkspaceGid={selectedResources[type]?.workspaceGid}
                      initialProjectGid={selectedResources[type]?.projectGid}
                      onWorkspaceSelected={(workspaceGid, workspaceName) => {
                        // CRITICAL: Pass workspace info but ALWAYS preserve the connected_account_id
                        // connectedAccountId prop comes from IntegrationConnect and is the Composio connected_account_id (ca_*)
                        // workspaceGid is the Asana workspace GID (numeric)
                        // We MUST use connectedAccountId prop, NOT the workspaceGid, for the 'id' field
                        const current = selectedResources[type];
                        
                        // Determine the correct connected_account_id to use
                        // Priority: 1) connectedAccountId prop (most reliable - comes from IntegrationConnect), 
                        //           2) current?.id if it's a Composio ID (ca_*), 
                        //           3) fallback
                        let finalConnectedAccountId: string;
                        if (connectedAccountId && connectedAccountId.startsWith('ca_')) {
                          // Use prop first - it's the source of truth from IntegrationConnect
                          finalConnectedAccountId = connectedAccountId;
                        } else if (current?.id && current.id.startsWith('ca_')) {
                          // Fallback to current selection if prop is invalid
                          finalConnectedAccountId = current.id;
                        } else {
                          // Fallback - shouldn't happen, but log warning
                          console.warn(`[IntegrationSelector] No valid connected_account_id found for ${type}. Current: ${current?.id}, Prop: ${connectedAccountId}`);
                          finalConnectedAccountId = connectedAccountId || current?.id || '';
                        }
                        
                        console.log(`[IntegrationSelector] Workspace selected for ${type}: workspaceGid=${workspaceGid}, connectedAccountId prop=${connectedAccountId}, preserving connected_account_id=${finalConnectedAccountId}`);
                        
                        // Update selection with workspace info, preserving connected_account_id
                        // IMPORTANT: Preserve all existing fields (like workspaceGid if already set)
                        updateSelection(type, {
                          id: finalConnectedAccountId, // ALWAYS use Composio connected_account_id, never workspace GID
                          name: workspaceName,
                          mode: current?.mode || "connected",
                          workspaceGid: workspaceGid, // Store workspace GID separately
                          // Preserve other resource IDs if they exist
                          ...(current?.projectGid && { projectGid: current.projectGid }),
                          ...(current?.repoId && { repoId: current.repoId }),
                          ...(current?.folderId && { folderId: current.folderId }),
                        });
                        console.log(`[IntegrationSelector] Updated selection with workspaceGid:`, { type, id: finalConnectedAccountId, workspaceGid, name: workspaceName });
                      }}
                      onProjectSelected={(projectGid, projectName, workspaceGid) => {
                        // CRITICAL: Pass project info but ALWAYS preserve the connected_account_id
                        const current = selectedResources[type];
                        
                        // Determine the correct connected_account_id to use
                        let finalConnectedAccountId: string;
                        if (current?.id && current.id.startsWith('ca_')) {
                          finalConnectedAccountId = current.id;
                        } else if (connectedAccountId && connectedAccountId.startsWith('ca_')) {
                          finalConnectedAccountId = connectedAccountId;
                        } else {
                          console.warn(`[IntegrationSelector] No valid connected_account_id found for ${type} project selection`);
                          finalConnectedAccountId = connectedAccountId || current?.id || '';
                        }
                        
                        console.log(`[IntegrationSelector] Project selected for ${type}: projectGid=${projectGid}, preserving connected_account_id=${finalConnectedAccountId}`);
                        
                        // Update selection with project info, preserving connected_account_id
                        updateSelection(type, {
                          id: finalConnectedAccountId, // ALWAYS use Composio connected_account_id
                          name: projectName,
                          mode: current?.mode || "connected",
                          workspaceGid: workspaceGid,
                          projectGid: projectGid,
                        });
                      }}
                    />
                  )}
                  {selectedResource && (
                    <div className="text-xs text-muted-foreground">
                      Selected: {selectedResource.name}
                    </div>
                  )}
                </div>
              )}

              {/* Sandbox mode info */}
              {isSandboxMode && (
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  Using Seer's sandboxed {config.displayName} integration. Connect your account to use your own data.
                </div>
              )}

              {/* Error/unknown messages */}
              {status === "unknown" && (
                <div className="text-xs text-muted-foreground">
                  Auth config not set. Add <code className="text-xs bg-muted px-1 py-0.5 rounded">VITE_COMPOSIO_{type === "googledrive" ? "GOOGLEDRIVE" : type.toUpperCase()}_AUTH_CONFIG_ID</code> to your .env file.
                </div>
              )}
              {status === "error" && (
                <div className="text-xs text-destructive">
                  Connection failed. Please try again.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </IntegrationConnect>
  );
}

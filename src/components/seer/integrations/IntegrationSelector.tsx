/**
 * Compact integration selector component for chat area
 * ChatGPT-style dropdown using Command component
 */

import { IntegrationConnect } from "./IntegrationConnect";
import { GithubRepoSelector } from "./GithubRepoSelector";
import { GoogleDriveFolderSelector } from "./GoogleDriveFolderSelector";
import { AsanaWorkspaceSelector } from "./AsanaWorkspaceSelector";
import { INTEGRATION_CONFIGS, IntegrationType } from "@/lib/composio/integrations";
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
import { CheckCircle2, ChevronDown, Loader2, AlertTriangle, RefreshCcw, XCircle, Link, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const INTEGRATION_ORDER: IntegrationType[] = ["sandbox", "github", "googledrive", "asana"];

export function IntegrationSelector() {
  const [open, setOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType>("sandbox"); // Default to sandbox
  const [selectedResources, setSelectedResources] = useState<Record<IntegrationType, { id: string; name: string } | null>>({
    sandbox: null,
    github: null,
    googledrive: null,
    asana: null,
  });
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

  const handleResourceSelected = (type: IntegrationType) => (id: string, name: string) => {
    setSelectedResources((prev) => ({ ...prev, [type]: { id, name } }));
  };

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
  selectedResource: { id: string; name: string } | null;
}

function IntegrationCommandItem({
  type,
  isSelected,
  onSelect,
  onResourceSelected,
  selectedResource,
}: IntegrationCommandItemProps) {
  const config = INTEGRATION_CONFIGS[type];

  return (
    <IntegrationConnect type={type}>
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
              <config.icon className={cn(
                "h-4 w-4 shrink-0",
                type === "sandbox" && "text-seer"
              )} />
              <span className="text-sm font-medium truncate">{config.displayName}</span>
              {type === "sandbox" && (
                <Badge variant="outline" className="text-xs bg-seer/10 text-seer border-seer/20 ml-auto">
                  Default
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

              {/* Resource Selection */}
              {status === "connected" && connectedAccountId && type !== "sandbox" && (
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
                      onWorkspaceSelected={onResourceSelected}
                      onProjectSelected={onResourceSelected}
                    />
                  )}
                  {selectedResource && (
                    <div className="text-xs text-muted-foreground">
                      Selected: {selectedResource.name}
                    </div>
                  )}
                </div>
              )}

              {/* Sandbox info */}
              {type === "sandbox" && (
                <div className="text-xs text-muted-foreground">
                  Use Seer's sandboxed integrations to explore the platform without connecting your accounts.
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

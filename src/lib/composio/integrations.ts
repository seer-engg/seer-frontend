/**
 * Integration configuration and types for Composio integrations
 */

import type { IntegrationType } from "./client";
import { Github, FolderOpen, CheckSquare2, Sparkles, Mail } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface IntegrationConfig {
  type: IntegrationType;
  displayName: string;
  icon: LucideIcon;
  toolkitSlug: string;
  requiresResourceSelection: boolean;
  resourceLabel?: string; // e.g., "Repository", "Folder", "Workspace"
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  sandbox: {
    type: "sandbox",
    displayName: "Seer Sandbox",
    icon: Sparkles,
    toolkitSlug: "sandbox",
    requiresResourceSelection: false,
    resourceLabel: undefined,
  },
  github: {
    type: "github",
    displayName: "GitHub",
    icon: Github,
    toolkitSlug: "github",
    requiresResourceSelection: true,
    resourceLabel: "Repository",
  },
  googledrive: {
    type: "googledrive",
    displayName: "Google Drive",
    icon: FolderOpen,
    toolkitSlug: "googledrive",
    requiresResourceSelection: false, // Optional
    resourceLabel: "Folder",
  },
  asana: {
    type: "asana",
    displayName: "Asana",
    icon: CheckSquare2,
    toolkitSlug: "asana",
    requiresResourceSelection: true,
    resourceLabel: "Workspace",
  },
  gmail: {
    type: "gmail",
    displayName: "Gmail",
    icon: Mail,
    toolkitSlug: "gmail",
    requiresResourceSelection: false,
    resourceLabel: "Mailbox",
  },
};

export type ConnectionStatus = "unknown" | "needs-auth" | "pending" | "connected" | "error";

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  toolkit: string;
}


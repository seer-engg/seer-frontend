/**
 * Integration configuration and types
 */

import type { IntegrationType } from "./client";
import { Github, FolderOpen, CheckSquare2, Sparkles, Mail, FileText } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { getRequiredScopes } from "./client";

export interface IntegrationConfig {
  type: IntegrationType;
  displayName: string;
  icon: LucideIcon;
  toolkitSlug: string;
  requiresResourceSelection: boolean;
  resourceLabel?: string; // e.g., "Repository", "Folder", "Workspace"
  requiredScopes: string[]; // OAuth scopes required for this integration
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  sandbox: {
    type: "sandbox",
    displayName: "Seer Sandbox",
    icon: Sparkles,
    toolkitSlug: "sandbox",
    requiresResourceSelection: false,
    resourceLabel: undefined,
    requiredScopes: [], // No OAuth needed
  },
  github: {
    type: "github",
    displayName: "GitHub",
    icon: Github,
    toolkitSlug: "github",
    requiresResourceSelection: true,
    resourceLabel: "Repository",
    requiredScopes: getRequiredScopes("github"),
  },
  googledrive: {
    type: "googledrive",
    displayName: "Google Drive",
    icon: FolderOpen,
    toolkitSlug: "googledrive",
    requiresResourceSelection: false, // Optional
    resourceLabel: "Folder",
    requiredScopes: getRequiredScopes("googledrive"),
  },
  asana: {
    type: "asana",
    displayName: "Asana",
    icon: CheckSquare2,
    toolkitSlug: "asana",
    requiresResourceSelection: true,
    resourceLabel: "Workspace",
    requiredScopes: getRequiredScopes("asana"),
  },
  gmail: {
    type: "gmail",
    displayName: "Gmail",
    icon: Mail,
    toolkitSlug: "gmail",
    requiresResourceSelection: false,
    resourceLabel: "Mailbox",
    requiredScopes: getRequiredScopes("gmail"),
  },
  googlesheets: {
    type: "googlesheets",
    displayName: "Google Sheets",
    icon: FileText,
    toolkitSlug: "googlesheets",
    requiresResourceSelection: false,
    resourceLabel: "Spreadsheet",
    requiredScopes: getRequiredScopes("googlesheets"),
  },
};

export type ConnectionStatus = "unknown" | "needs-auth" | "pending" | "connected" | "error";

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  toolkit: string;
}


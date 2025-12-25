/**
 * Integration configuration and types
 */

import type { IntegrationType } from "./client";
import { CheckSquare2, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import { getRequiredScopes } from "./client";
import { GmailIcon } from "@/components/icons/gmail";
import { GoogleDriveIcon } from "@/components/icons/googledrive";
import { GoogleSheetsIcon } from "@/components/icons/googlesheets";
import { GitHubIcon } from "@/components/icons/github";

export interface IntegrationConfig {
  type: IntegrationType;
  displayName: string;
  icon: ComponentType<{ className?: string }>;
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
    icon: GitHubIcon,
    toolkitSlug: "github",
    requiresResourceSelection: true,
    resourceLabel: "Repository",
    requiredScopes: getRequiredScopes("github"),
  },
  pull_request: {
    type: "pull_request",
    displayName: "GitHub Pull Requests",
    icon: GitHubIcon,
    toolkitSlug: "github",
    requiresResourceSelection: true,
    resourceLabel: "Repository",
    requiredScopes: getRequiredScopes("github"),
  },
  google_drive: {
    type: "google_drive",
    displayName: "Google Drive",
    icon: GoogleDriveIcon,
    toolkitSlug: "googledrive",
    requiresResourceSelection: false, // Optional
    resourceLabel: "Folder",
    requiredScopes: getRequiredScopes("google_drive"),
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
    icon: GmailIcon,
    toolkitSlug: "gmail",
    requiresResourceSelection: false,
    resourceLabel: "Mailbox",
    requiredScopes: getRequiredScopes("gmail"),
  },
  google_sheets: {
    type: "google_sheets",
    displayName: "Google Sheets",
    icon: GoogleSheetsIcon,
    toolkitSlug: "googlesheets",
    requiresResourceSelection: false,
    resourceLabel: "Spreadsheet",
    requiredScopes: getRequiredScopes("google_sheets"),
  },
};

export type ConnectionStatus = "unknown" | "needs-auth" | "pending" | "connected" | "error";

export interface ConnectedAccount {
  id: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  toolkit: string;
}


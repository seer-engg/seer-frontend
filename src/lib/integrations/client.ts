/**
 * Integration client for OAuth connections
 * Frontend controls OAuth scopes (read-only is core differentiation)
 */

import { getGitHubToolScopes } from './github_tool_scopes';

export type IntegrationType = "sandbox" | "github" | "googledrive" | "asana" | "gmail" | "googlesheets";

/**
 * Get required OAuth scopes for an integration type.
 * Frontend controls which scopes to request - this is our core differentiation.
 * 
 * @param integrationType - Integration type
 * @param toolName - Optional tool name for tool-specific scopes
 * @returns Array of OAuth scope strings
 */
export function getRequiredScopes(
  integrationType: IntegrationType,
  toolName?: string
): string[] {
  // Base scopes for identity
  const baseScopes = ["openid", "email", "profile"];
  
  switch (integrationType) {
    case "github":
      // Use tool-specific scopes if toolName is provided
      if (toolName) {
        return getGitHubToolScopes(toolName);
      }
      // Fallback to default GitHub scopes
      return [
        "user:email",
        "read:user",
        "repo", // Conservative default
      ];
    
    case "googledrive":
      // Read-only Google Drive scope
      return [
        ...baseScopes,
        "https://www.googleapis.com/auth/drive.readonly",
      ];
    
    case "gmail":
      // Read-only Gmail scope
      return [
        ...baseScopes,
        "https://www.googleapis.com/auth/gmail.readonly",
      ];
    
    case "googlesheets":
      // Google Sheets read/write scope
      return [
        ...baseScopes,
        "https://www.googleapis.com/auth/spreadsheets",
      ];
    
    case "asana":
      // Asana scopes (adjust based on Asana OAuth requirements)
      return [
        ...baseScopes,
        // Add Asana-specific read-only scopes when available
      ];
    
    case "sandbox":
      // Sandbox doesn't need OAuth
      return [];
    
    default:
      return baseScopes;
  }
}

/**
 * Format scopes as space-separated string for OAuth request.
 */
export function formatScopes(scopes: string[]): string {
  return scopes.join(" ");
}


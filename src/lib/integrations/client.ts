/**
 * Integration client for OAuth connections
 * Frontend controls OAuth scopes (read-only is core differentiation)
 */

import { getGitHubToolScopes } from './github_tool_scopes';

export type IntegrationType = "sandbox" | "github" | "google_drive" | "asana" | "gmail" | "google_sheets";

/**
 * OAuth provider type - used for OAuth connections
 * Multiple integration types can map to the same provider (e.g., gmail, googledrive, googlesheets all use 'google')
 */
export type OAuthProvider = "google" | "github" | "asana";

/**
 * Map integration type to OAuth provider.
 * This is used when initiating OAuth connections - the backend expects the provider, not the integration type.
 * 
 * @param integrationType - The integration type (e.g., 'gmail', 'googledrive', 'googlesheets')
 * @returns The OAuth provider to use for the connection (e.g., 'google')
 */
export function getOAuthProvider(integrationType: IntegrationType): OAuthProvider | null {
  switch (integrationType) {
    case "gmail":
    case "google_drive":
      return "google";
    case "google_sheets":
      return "google";
    case "github":
      return "github";
    case "asana":
      return "asana";
    case "sandbox":
      return null; // Sandbox doesn't need OAuth
    default:
      return null;
  }
}

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
    
    case "google_drive":
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
    
    case "google_sheets":
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


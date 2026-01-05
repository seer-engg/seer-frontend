/**
 * Integration client for OAuth connections
 * Frontend controls OAuth scopes (read-only is core differentiation)
 */

export type IntegrationType =
  | "sandbox"
  | "github"
  | "pull_request"
  | "google_drive"
  | "google_sheets"
  | "asana"
  | "gmail"
  | "supabase";

/**
 * OAuth provider type - used for OAuth connections
 * Multiple integration types can map to the same provider (e.g., gmail, google_drive, google_sheets all use 'google')
 */
export type OAuthProvider = "google" | "github" | "asana" | "supabase_mgmt";

/**
 * Map integration type to OAuth provider.
 * This is used when initiating OAuth connections - the backend expects the provider, not the integration type.
 * 
 * @param integrationType - The integration type (e.g., 'gmail', 'google_drive', 'google_sheets')
 * @returns The OAuth provider to use for the connection (e.g., 'google')
 */
export function getOAuthProvider(integrationType: IntegrationType): OAuthProvider | null {
  switch (integrationType) {
    case "gmail":
    case "google_drive":
    case "google_sheets":
      return "google";
    case "github":
    case "pull_request":
      return "github";
    case "asana":
      return "asana";
    case "supabase":
      return "supabase_mgmt";
    case "sandbox":
      return null; // Sandbox doesn't need OAuth
    default:
      return null;
  }
}

/**
 * Format scopes as space-separated string for OAuth request.
 */
export function formatScopes(scopes: string[]): string {
  return scopes.join(" ");
}


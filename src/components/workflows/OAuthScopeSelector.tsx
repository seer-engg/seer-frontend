/**
 * OAuth Scope Selector Component
 * 
 * CRITICAL: This component is part of the closed-source frontend.
 * OAuth scopes are defined and validated here, then passed to the backend.
 * The backend (open-source) trusts the scope passed from frontend.
 */

// OAuth scope definitions (CLOSED SOURCE - frontend only)
export const OAUTH_SCOPES = {
  gmail: {
    readonly: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    full: 'openid email profile https://www.googleapis.com/auth/gmail',
  },
  github: {
    read: 'read:user read:repo read:org read:gpg_key',
    write: 'read:user read:repo write:repo read:org write:org read:gpg_key write:gpg_key',
    admin: 'read:user read:repo write:repo admin:repo read:org write:org admin:org read:gpg_key write:gpg_key',
  },
  googledrive: {
    readonly: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
    full: 'openid email profile https://www.googleapis.com/auth/drive',
  },
} as const;

export type ProviderType = keyof typeof OAUTH_SCOPES;
export type ScopeLevel = 'readonly' | 'read' | 'write' | 'full' | 'admin';

export interface OAuthScopeConfig {
  provider: ProviderType;
  level: ScopeLevel;
  scope: string;
}

/**
 * Get OAuth scope string for a provider and level.
 * 
 * @param provider Provider type
 * @param level Scope level
 * @returns OAuth scope string
 */
export function getOAuthScope(provider: ProviderType, level: ScopeLevel): string {
  return OAUTH_SCOPES[provider][level];
}

/**
 * Validate OAuth scope string.
 * 
 * @param provider Provider type
 * @param scope Scope string to validate
 * @returns True if scope is valid for provider
 */
export function validateOAuthScope(provider: ProviderType, scope: string): boolean {
  const validScopes = Object.values(OAUTH_SCOPES[provider]);
  return validScopes.includes(scope as any);
}


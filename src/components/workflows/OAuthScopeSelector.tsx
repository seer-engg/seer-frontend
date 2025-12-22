/**
 * OAuth Scope Selector Component
 * 
 * CRITICAL: This component is part of the closed-source frontend.
 * OAuth scopes are defined and validated here, then passed to the backend.
 * The backend (open-source) trusts the scope passed from frontend.
 */
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface OAuthScopeSelectorProps {
  provider: ProviderType;
  value?: ScopeLevel;
  onChange: (scope: string) => void;
  disabled?: boolean;
}

export function OAuthScopeSelector({
  provider,
  value,
  onChange,
  disabled = false,
}: OAuthScopeSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<ScopeLevel | undefined>(value);

  const scopeOptions = OAUTH_SCOPES[provider];
  const availableLevels = Object.keys(scopeOptions) as ScopeLevel[];

  const handleLevelChange = (level: ScopeLevel) => {
    setSelectedLevel(level);
    const scope = scopeOptions[level];
    onChange(scope);
  };

  const getScopeDescription = (level: ScopeLevel): string => {
    switch (level) {
      case 'readonly':
      case 'read':
        return 'Read-only access. Can view data but cannot modify.';
      case 'write':
        return 'Read and write access. Can view and modify data.';
      case 'full':
        return 'Full access. Can view, modify, and delete data.';
      case 'admin':
        return 'Administrative access. Full control including settings.';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">OAuth Scope</CardTitle>
        <CardDescription>
          Select the permission level for {provider} integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scope-level">Permission Level</Label>
          <Select
            value={selectedLevel}
            onValueChange={(value) => handleLevelChange(value as ScopeLevel)}
            disabled={disabled}
          >
            <SelectTrigger id="scope-level">
              <SelectValue placeholder="Select permission level" />
            </SelectTrigger>
            <SelectContent>
              {availableLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  <div className="flex flex-col">
                    <span className="font-medium capitalize">{level}</span>
                    <span className="text-xs text-muted-foreground">
                      {getScopeDescription(level)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLevel && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="space-y-1">
                <div>
                  <strong>Selected:</strong> {selectedLevel}
                </div>
                <div className="font-mono text-xs break-all">
                  {scopeOptions[selectedLevel]}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
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


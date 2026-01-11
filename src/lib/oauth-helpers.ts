/**
 * Helper function to format OAuth scope names for display
 */
export function formatScopeName(scope: string): string {
  // Google scopes
  if (scope.includes('googleapis.com')) {
    const match = scope.match(/\/auth\/([^/]+)$/);
    if (!match) return scope;

    const service = match[1];
    const serviceMap: Record<string, string> = {
      'gmail.readonly': 'Gmail (read-only)',
      'gmail': 'Gmail (full access)',
      'gmail.send': 'Gmail (send)',
      'gmail.modify': 'Gmail (modify)',
      'drive.readonly': 'Google Drive (read-only)',
      'drive': 'Google Drive (full access)',
      'spreadsheets.readonly': 'Google Sheets (read-only)',
      'spreadsheets': 'Google Sheets (full access)',
    };
    return serviceMap[service] || service;
  }

  // GitHub scopes - return as-is
  if (scope.startsWith('read:') || scope.startsWith('write:') || scope.startsWith('admin:')) {
    return scope;
  }

  // OpenID scopes
  if (scope === 'openid') return 'OpenID Connect';
  if (scope === 'email' || scope === 'profile') {
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  }

  return scope;
}

/**
 * Helper function to get provider display name
 */
export function getProviderDisplayName(provider: string): string {
  const providerMap: Record<string, string> = {
    'google': 'Google',
    'github': 'GitHub',
  };
  return providerMap[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

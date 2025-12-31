import React from 'react';
import { Globe, GitPullRequest, Plug, Wrench } from 'lucide-react';

import { GitHubIcon } from '@/components/icons/github';
import { GmailIcon } from '@/components/icons/gmail';
import { GoogleDriveIcon } from '@/components/icons/googledrive';
import { GoogleSheetsIcon } from '@/components/icons/googlesheets';

export const formatGroupLabel = (value: string) => {
  const normalized = value.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return 'Other';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const normalizeIntegrationTypeKey = (value: string) => value.toLowerCase().trim();

export const getProviderIcon = (provider: string) => {
  const p = provider.toLowerCase();
  switch (p) {
    case 'google':
      return <Globe className="w-3.5 h-3.5 text-muted-foreground" />;
    case 'github':
      return <GitHubIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return <Plug className="w-3.5 h-3.5 text-muted-foreground" />;
  }
};

export const getIntegrationTypeIcon = (integrationType: string) => {
  const key = normalizeIntegrationTypeKey(integrationType);
  switch (key) {
    case 'gmail':
      return <GmailIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    case 'googledrive':
    case 'google_drive':
      return <GoogleDriveIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    case 'googlesheets':
    case 'google_sheets':
      return <GoogleSheetsIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    case 'github':
    case 'pull_request':
      return <GitHubIcon className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return <Wrench className="w-3.5 h-3.5 text-muted-foreground" />;
  }
};

export const getIntegrationTypeLabel = (integrationType: string) => {
  const key = normalizeIntegrationTypeKey(integrationType);
  switch (key) {
    case 'gmail':
      return 'Gmail';
    case 'googledrive':
    case 'google_drive':
      return 'Google Drive';
    case 'googlesheets':
    case 'google_sheets':
      return 'Google Sheets';
    case 'github':
    case 'pull_request':
      return 'GitHub';
    default:
      return formatGroupLabel(integrationType);
  }
};

export const filterSystemPrompt = (content: string): string => {
  const systemPromptPattern = /I help you build, inspect, edit.*?Concretely I can:/s;
  let filtered = content.replace(systemPromptPattern, '').trim();
  filtered = filtered.replace(/What I can do \(high level\).*?$/s, '').trim();
  filtered = filtered.replace(/Your capabilities:.*?$/s, '').trim();
  return filtered;
};


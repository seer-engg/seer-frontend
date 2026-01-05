import React from 'react';
import { Globe, GitPullRequest, Plug, Wrench, Database } from 'lucide-react';

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
    case 'supabase':
      return <Database className="w-3.5 h-3.5 text-muted-foreground" />;
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
    case 'supabase':
      return 'Supabase';
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

const JSON_CODE_BLOCK_RE = /```json[\s\S]*?```/gi;
const ANY_CODE_BLOCK_RE = /```[\s\S]*?```/g;
const GENERIC_PROPOSAL_MESSAGE = 'Workflow proposal ready. Preview it in the canvas.';

const stripCodeBlocks = (content: string, pattern: RegExp) => {
  return content.replace(pattern, '').trim();
};

const isLikelyJsonPayload = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const startsWithBrace = trimmed.startsWith('{') && trimmed.endsWith('}');
  const startsWithBracket = trimmed.startsWith('[') && trimmed.endsWith(']');
  if (!startsWithBrace && !startsWithBracket) {
    return false;
  }
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
};

export const getDisplayableAssistantMessage = (content: string, fallback?: string) => {
  if (!content) {
    return (fallback?.trim() || GENERIC_PROPOSAL_MESSAGE);
  }
  const withoutJsonBlocks = stripCodeBlocks(content, JSON_CODE_BLOCK_RE);
  if (withoutJsonBlocks) {
    return withoutJsonBlocks;
  }
  const withoutCodeBlocks = stripCodeBlocks(content, ANY_CODE_BLOCK_RE);
  if (withoutCodeBlocks) {
    return withoutCodeBlocks;
  }
  if (isLikelyJsonPayload(content)) {
    return fallback?.trim() || GENERIC_PROPOSAL_MESSAGE;
  }
  return fallback?.trim() || GENERIC_PROPOSAL_MESSAGE;
};


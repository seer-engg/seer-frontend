import { Database, Wrench } from 'lucide-react';
import { GmailSVG } from '@/components/icons/gmail';
import { GoogleDriveSVG } from '@/components/icons/googledrive';
import { GoogleSheetsSVG } from '@/components/icons/googlesheets';
import { GitHubSVG } from '@/components/icons/github';
import type { IntegrationType } from './client';

/**
 * Get icon for integration type
 */
export function getIntegrationIcon(integrationType: IntegrationType | null) {
  const key = integrationType?.toLowerCase() ?? '';
  switch (key) {
    case 'gmail':
      return <GmailSVG width={16} height={16} />;
    case 'google_drive':
    case 'googledrive':
      return <GoogleDriveSVG width={16} height={16} />;
    case 'google_sheets':
    case 'googlesheets':
      return <GoogleSheetsSVG width={16} height={16} />;
    case 'github':
    case 'pull_request':
      return <GitHubSVG width={16} height={16} />;
    case 'supabase':
      return <Database className="w-4 h-4" />;
    default:
      return <Wrench className="w-4 h-4" />;
  }
}

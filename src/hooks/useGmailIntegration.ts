import { useMemo } from 'react';
import { useToolsStore } from '@/stores/toolsStore';
import { GMAIL_TOOL_FALLBACK_NAMES } from '@/components/workflows/triggers/constants';

const parseProviderConnectionId = (raw?: string | null): number | null => {
  if (!raw) {
    return null;
  }
  const segments = raw.split(':');
  const numeric = Number(segments[segments.length - 1]);
  return Number.isNaN(numeric) ? null : numeric;
};

export function useGmailIntegration() {
  const integrationTools = useToolsStore((state) => state.tools);
  const isIntegrationConnected = useToolsStore((state) => state.isIntegrationConnected);
  const getConnectionId = useToolsStore((state) => state.getConnectionId);

  const gmailToolNames = useMemo(() => {
    const normalized = Array.isArray(integrationTools) ? integrationTools : [];
    const names = normalized
      .filter((tool) => {
        const integration = tool.integration_type?.toLowerCase();
        if (integration) {
          return integration === 'gmail';
        }
        return tool.name.toLowerCase().includes('gmail');
      })
      .map((tool) => tool.name);
    return names.length > 0 ? names : GMAIL_TOOL_FALLBACK_NAMES;
  }, [integrationTools]);

  const gmailConnectionIdRaw = getConnectionId('gmail');
  const gmailConnectionId = useMemo(
    () => parseProviderConnectionId(gmailConnectionIdRaw),
    [gmailConnectionIdRaw],
  );

  const gmailIntegrationReady =
    isIntegrationConnected('gmail') && typeof gmailConnectionId === 'number';

  return {
    gmailToolNames,
    gmailConnectionId,
    gmailIntegrationReady,
  };
}

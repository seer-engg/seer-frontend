import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useBackendHealth } from '@/lib/backend-health';
import { useToolsStore } from '@/stores/toolsStore';

export function useBackendConnectionEffects() {
  const { isHealthy } = useBackendHealth();
  const [searchParams, setSearchParams] = useSearchParams();
  const refreshIntegrationTools = useToolsStore((state) => state.refreshIntegrationTools);

  // Show toast notifications for backend status changes
  useEffect(() => {
    if (isHealthy === true) {
      toast.success('Backend Connected', {
        description: 'Successfully connected to backend server',
        duration: 3000,
      });
    } else if (isHealthy === false) {
      toast.error('Backend Disconnected', {
        description: 'Unable to connect to backend server',
        duration: 5000,
      });
    }
  }, [isHealthy]);

  // Handle OAuth connection redirect - refresh integration status when connected
  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    if (connectedParam) {
      // Refresh integration tools status to reflect new connection
      refreshIntegrationTools();

      // Show success toast
      toast.success('Integration Connected', {
        description: `Successfully connected to ${connectedParam}`,
        duration: 3000,
      });

      // Remove query parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('connected');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, refreshIntegrationTools, setSearchParams]);
}

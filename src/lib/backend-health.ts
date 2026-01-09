import { useState, useEffect } from 'react';
import { backendApiClient } from './api-client';
import { P } from 'node_modules/framer-motion/dist/types.d-DagZKalS';

/**
 * Hook to check backend health with polling
 */

const POLL_INTERVAL_MS = import.meta.env.VITE_BACKEND_HEALTH_POLL_INTERVAL || 60000; // Default to 60 seconds
export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Try /health endpoint first, then /api/health
      // Do NOT fall back to /api/v1/workflows as that's a heavyweight endpoint
      try {
        await backendApiClient.request('/health', {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        setIsHealthy(true);
        return;
      } catch {
        // Try /api/health as fallback
        await backendApiClient.request('/api/health', {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        setIsHealthy(true);
        return;
      }
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, isChecking, checkHealth };
}


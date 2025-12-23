import { useState, useEffect } from 'react';
import { backendApiClient } from './api-client';

/**
 * Backend health check utility
 * 
 * Checks if the backend server is running using the configured backend URL
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    try {
      await backendApiClient.request('/health', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      // Try with /api/health as fallback
      await backendApiClient.request('/api/health', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Hook to check backend health with polling
 */

export function useBackendHealth(intervalMs: number = 5000) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      await backendApiClient.request('/api/workflows', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setIsHealthy(true);
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return { isHealthy, isChecking, checkHealth };
}


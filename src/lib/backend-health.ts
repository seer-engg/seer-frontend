/**
 * Backend health check utility
 * 
 * Checks if the backend server is running on localhost:8000
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch('http://localhost:8000/health', {
      method: 'GET',
      signal: controller.signal,
      mode: 'no-cors', // Avoid CORS issues for health check
    }).catch(() => {
      // Try with /api/health as fallback
      return fetch('http://localhost:8000/api/health', {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
    });
    
    clearTimeout(timeoutId);
    return response !== null && response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Hook to check backend health with polling
 */
import { useState, useEffect } from 'react';
import { getBackendBaseUrl } from './api-client';

export function useBackendHealth(intervalMs: number = 5000) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const backendUrl = getBackendBaseUrl();
      // Try to fetch from backend API endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${backendUrl}/api/workflows`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      setIsHealthy(response.ok);
    } catch (error) {
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


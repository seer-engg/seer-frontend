/**
 * Debounced Autosave Hook
 * 
 * Provides debounced autosave functionality for workflows.
 * Only saves if workflow has an ID (is already saved).
 */
import { useCallback, useRef, useEffect } from 'react';

interface UseDebouncedAutosaveOptions {
  delay?: number; // Debounce delay in milliseconds (default: 1000ms)
  enabled?: boolean; // Whether autosave is enabled (default: true)
}

interface UseDebouncedAutosaveParams<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  isDirty?: boolean; // Whether data has changed (optional optimization)
  options?: UseDebouncedAutosaveOptions;
}

export function useDebouncedAutosave<T>({
  data,
  onSave,
  isDirty = true,
  options = {},
}: UseDebouncedAutosaveParams<T>) {
  const { delay = 1000, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<T | null>(null);
  const isSavingRef = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(async () => {
    if (!enabled || !isDirty || isSavingRef.current) {
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if data actually changed
    if (lastSavedDataRef.current !== null) {
      const dataChanged = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
      if (!dataChanged) {
        return;
      }
    }

    isSavingRef.current = true;
    try {
      await onSave(data);
      // Store a deep copy to avoid reference issues
      lastSavedDataRef.current = JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.error('Autosave failed:', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, isDirty, enabled]);

  const triggerSave = useCallback(() => {
    if (!enabled || !isDirty) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
      timeoutRef.current = null;
    }, delay);
  }, [save, delay, enabled, isDirty]);

  // Reset last saved data when data changes externally (e.g., loading a workflow)
  const resetSavedData = useCallback(() => {
    lastSavedDataRef.current = null;
  }, []);

  return {
    triggerSave,
    saveImmediately: save,
    resetSavedData,
    isSaving: isSavingRef.current,
  };
}


import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

/**
 * Helper to create typed selector hooks for a given store.
 */
export function createSelectorHook<State>(store: StoreApi<State>) {
  return function useSelector<T>(selector: (state: State) => T) {
    return useStore(store, selector);
  };
}



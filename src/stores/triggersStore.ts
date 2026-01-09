import type { StateCreator } from 'zustand';

import type { TriggerDraftMeta } from '@/components/workflows/types';
import {
  createTriggerSubscription as apiCreateTriggerSubscription,
  deleteTriggerSubscription as apiDeleteTriggerSubscription,
  listTriggerSubscriptions,
  listTriggers,
  testTriggerSubscription as apiTestTriggerSubscription,
  updateTriggerSubscription as apiUpdateTriggerSubscription,
} from '@/lib/workflow-triggers';
import type {
  TriggerDescriptor,
  TriggerSubscriptionCreateRequest,
  TriggerSubscriptionResponse,
  TriggerSubscriptionTestRequest,
  TriggerSubscriptionTestResponse,
  TriggerSubscriptionUpdateRequest,
} from '@/types/triggers';

import { createStore } from './createStore';

export interface TriggersStore {
  triggerCatalog: TriggerDescriptor[];
  triggerCatalogLoading: boolean;
  triggerCatalogLoaded: boolean;
  triggerCatalogError: string | null;
  triggerSubscriptions: Record<string, TriggerSubscriptionResponse[]>;
  triggerSubscriptionsLoading: Record<string, boolean>;
  triggerSubscriptionsError: Record<string, string | null>;
  // Phase 1: Changed from array to Map keyed by workflowId
  draftTriggers: Map<string, TriggerDraftMeta[]>;
  loadTriggerCatalog: () => Promise<TriggerDescriptor[]>;
  loadTriggerSubscriptions: (workflowId: string) => Promise<TriggerSubscriptionResponse[]>;
  createTriggerSubscription: (
    payload: TriggerSubscriptionCreateRequest,
  ) => Promise<TriggerSubscriptionResponse>;
  updateTriggerSubscription: (
    subscriptionId: number,
    payload: TriggerSubscriptionUpdateRequest,
  ) => Promise<TriggerSubscriptionResponse>;
  deleteTriggerSubscription: (subscriptionId: number) => Promise<void>;
  testTriggerSubscription: (payload: {
    subscriptionId: number;
    payload: TriggerSubscriptionTestRequest;
  }) => Promise<TriggerSubscriptionTestResponse>;
  // Phase 1: New draft trigger management actions
  addDraftTrigger: (workflowId: string, triggerKey: string, initialBindings?: Record<string, unknown>) => void;
  saveDraftTrigger: (workflowId: string, draftId: string, config: unknown) => Promise<void>;
  discardDraftTrigger: (workflowId: string, draftId: string) => void;
  clearDraftTriggers: (workflowId: string) => void;
  // Legacy setter (kept for backward compatibility during migration)
  setDraftTriggers: (drafts: TriggerDraftMeta[]) => void;
}

const createTriggersStore: StateCreator<TriggersStore> = (set, get) => ({
  triggerCatalog: [],
  triggerCatalogLoading: false,
  triggerCatalogLoaded: false,
  triggerCatalogError: null,
  triggerSubscriptions: {},
  triggerSubscriptionsLoading: {},
  triggerSubscriptionsError: {},
  // Phase 1: Initialize as Map
  draftTriggers: new Map(),
  async loadTriggerCatalog() {
    if (get().triggerCatalogLoading) {
      return get().triggerCatalog;
    }
    set({ triggerCatalogLoading: true, triggerCatalogError: null });
    try {
      const triggers = await listTriggers();
      set({
        triggerCatalog: triggers,
        triggerCatalogLoading: false,
        triggerCatalogLoaded: true,
      });
      return triggers;
    } catch (error) {
      set({
        triggerCatalogLoading: false,
        triggerCatalogError: error instanceof Error ? error.message : 'Failed to load triggers',
      });
      throw error;
    }
  },
  async loadTriggerSubscriptions(workflowId) {
    if (!workflowId) {
      return [];
    }
    set((state) => ({
      triggerSubscriptionsLoading: {
        ...state.triggerSubscriptionsLoading,
        [workflowId]: true,
      },
      triggerSubscriptionsError: {
        ...state.triggerSubscriptionsError,
        [workflowId]: null,
      },
    }));
    try {
      const subscriptions = await listTriggerSubscriptions(workflowId);
      set((state) => ({
        triggerSubscriptions: {
          ...state.triggerSubscriptions,
          [workflowId]: subscriptions,
        },
        triggerSubscriptionsLoading: {
          ...state.triggerSubscriptionsLoading,
          [workflowId]: false,
        },
      }));
      return subscriptions;
    } catch (error) {
      set((state) => ({
        triggerSubscriptionsLoading: {
          ...state.triggerSubscriptionsLoading,
          [workflowId]: false,
        },
        triggerSubscriptionsError: {
          ...state.triggerSubscriptionsError,
          [workflowId]: error instanceof Error ? error.message : 'Failed to load trigger subscriptions',
        },
      }));
      throw error;
    }
  },
  async createTriggerSubscription(payload) {
    const created = await apiCreateTriggerSubscription(payload);
    set((state) => ({
      triggerSubscriptions: {
        ...state.triggerSubscriptions,
        [payload.workflow_id]: [...(state.triggerSubscriptions[payload.workflow_id] ?? []), created],
      },
    }));
    return created;
  },
  async updateTriggerSubscription(subscriptionId, payload) {
    const updated = await apiUpdateTriggerSubscription(subscriptionId, payload);
    set((state) => ({
      triggerSubscriptions: {
        ...state.triggerSubscriptions,
        [updated.workflow_id]: (state.triggerSubscriptions[updated.workflow_id] ?? []).map((subscription) =>
          subscription.subscription_id === updated.subscription_id ? updated : subscription,
        ),
      },
    }));
    return updated;
  },
  async deleteTriggerSubscription(subscriptionId) {
    await apiDeleteTriggerSubscription(subscriptionId);
    set((state) => {
      const next: Record<string, TriggerSubscriptionResponse[]> = {};
      for (const [workflowId, subscriptions] of Object.entries(state.triggerSubscriptions)) {
        next[workflowId] = subscriptions.filter((subscription) => subscription.subscription_id !== subscriptionId);
      }
      return { triggerSubscriptions: next };
    });
  },
  async testTriggerSubscription({ subscriptionId, payload }) {
    return apiTestTriggerSubscription(subscriptionId, payload);
  },
  // Phase 1: New draft trigger management implementations
  addDraftTrigger(workflowId, triggerKey, initialBindings = {}) {
    const draft: TriggerDraftMeta = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      triggerKey,
      initialBindings,
    };

    const state = get();
    const drafts = state.draftTriggers.get(workflowId) || [];
    const newDrafts = new Map(state.draftTriggers);
    newDrafts.set(workflowId, [...drafts, draft]);

    set({ draftTriggers: newDrafts });
  },
  async saveDraftTrigger(workflowId, draftId, config) {
    const state = get();
    const drafts = state.draftTriggers.get(workflowId) || [];
    const draft = drafts.find((d) => d.id === draftId);

    if (!draft) {
      throw new Error(`Draft trigger ${draftId} not found`);
    }

    // Create actual trigger subscription using the store's create method
    await state.createTriggerSubscription({
      workflow_id: workflowId,
      trigger_key: draft.triggerKey,
      config: config as Record<string, unknown>,
    });

    // Remove from drafts after successful creation
    state.discardDraftTrigger(workflowId, draftId);
  },
  discardDraftTrigger(workflowId, draftId) {
    const state = get();
    const drafts = state.draftTriggers.get(workflowId) || [];
    const newDrafts = new Map(state.draftTriggers);
    newDrafts.set(
      workflowId,
      drafts.filter((d) => d.id !== draftId),
    );

    set({ draftTriggers: newDrafts });
  },
  clearDraftTriggers(workflowId) {
    const state = get();
    const newDrafts = new Map(state.draftTriggers);
    newDrafts.delete(workflowId);
    set({ draftTriggers: newDrafts });
  },
  // Legacy setter (kept for backward compatibility during migration)
  setDraftTriggers(drafts) {
    // Convert array to Map for backward compatibility
    // Assume all drafts belong to the same workflow (current behavior)
    console.warn('setDraftTriggers is deprecated. Use addDraftTrigger/discardDraftTrigger instead.');
    set({ draftTriggers: new Map() });
  },
});

export const useTriggersStore = createStore(createTriggersStore);

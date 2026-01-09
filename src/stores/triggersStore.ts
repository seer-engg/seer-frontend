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
  draftTriggers: TriggerDraftMeta[];
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
  draftTriggers: [],
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
  setDraftTriggers(drafts) {
    set({ draftTriggers: drafts });
  },
});

export const useTriggersStore = createStore(createTriggersStore);

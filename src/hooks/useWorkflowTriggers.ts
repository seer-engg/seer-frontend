import { useCallback, useEffect } from 'react';

import { useTriggersStore } from '@/stores/triggersStore';
import type {
  TriggerDescriptor,
  TriggerSubscriptionCreateRequest,
  TriggerSubscriptionResponse,
  TriggerSubscriptionTestRequest,
  TriggerSubscriptionTestResponse,
  TriggerSubscriptionUpdateRequest,
} from '@/types/triggers';

interface TogglePayload {
  subscriptionId: number;
  enabled: boolean;
}

interface TestPayload {
  subscriptionId: number;
  payload: TriggerSubscriptionTestRequest;
}

export interface UseWorkflowTriggersResult {
  triggers: TriggerDescriptor[];
  subscriptions: TriggerSubscriptionResponse[];
  isLoadingTriggers: boolean;
  isLoadingSubscriptions: boolean;
  refetchSubscriptions: () => Promise<TriggerSubscriptionResponse[] | undefined>;
  loadTriggerCatalogIfNeeded: () => Promise<TriggerDescriptor[]>;
  createSubscription: (payload: TriggerSubscriptionCreateRequest) => Promise<TriggerSubscriptionResponse>;
  updateSubscription: (
    subscriptionId: number,
    payload: TriggerSubscriptionUpdateRequest,
  ) => Promise<TriggerSubscriptionResponse>;
  toggleSubscription: (payload: TogglePayload) => Promise<TriggerSubscriptionResponse>;
  deleteSubscription: (subscriptionId: number) => Promise<void>;
  testSubscription: (payload: TestPayload) => Promise<TriggerSubscriptionTestResponse>;
}

export function useWorkflowTriggers(workflowId?: string | null): UseWorkflowTriggersResult {
  // FIXED: Individual selectors instead of useShallow
  const triggerCatalog = useTriggersStore((state) => state.triggerCatalog);
  const triggerCatalogLoading = useTriggersStore((state) => state.triggerCatalogLoading);
  const triggerSubscriptions = useTriggersStore((state) => state.triggerSubscriptions);
  const triggerSubscriptionsLoading = useTriggersStore((state) => state.triggerSubscriptionsLoading);
  const loadTriggerCatalog = useTriggersStore((state) => state.loadTriggerCatalog);
  const loadTriggerSubscriptions = useTriggersStore((state) => state.loadTriggerSubscriptions);
  const createTriggerSubscription = useTriggersStore((state) => state.createTriggerSubscription);
  const updateTriggerSubscription = useTriggersStore((state) => state.updateTriggerSubscription);
  const deleteTriggerSubscription = useTriggersStore((state) => state.deleteTriggerSubscription);
  const testTriggerSubscription = useTriggersStore((state) => state.testTriggerSubscription);

  const subscriptions = workflowId ? triggerSubscriptions[workflowId] ?? [] : [];
  const isLoadingSubscriptions = workflowId
    ? Boolean(triggerSubscriptionsLoading[workflowId])
    : false;

  // Removed auto-load effect - trigger catalog now loads on-demand
  // Components should call loadTriggerCatalogIfNeeded() explicitly

  useEffect(() => {
    if (!workflowId) {
      return;
    }
    const hasData = Boolean(triggerSubscriptions[workflowId]);
    const isFetching = Boolean(triggerSubscriptionsLoading[workflowId]);
    if (!hasData && !isFetching) {
      void loadTriggerSubscriptions(workflowId).catch(() => undefined);
    }
  }, [workflowId, triggerSubscriptions, triggerSubscriptionsLoading, loadTriggerSubscriptions]);

  const refetchSubscriptions = useCallback(() => {
    if (!workflowId) {
      return Promise.resolve(undefined);
    }
    return loadTriggerSubscriptions(workflowId);
  }, [workflowId, loadTriggerSubscriptions]);

  const loadTriggerCatalogIfNeeded = useCallback(() => {
    if (!triggerCatalog.length && !triggerCatalogLoading) {
      return loadTriggerCatalog();
    }
    return Promise.resolve(triggerCatalog);
  }, [triggerCatalog, triggerCatalogLoading, loadTriggerCatalog]);

  const toggleSubscription = useCallback(
    ({ subscriptionId, enabled }: TogglePayload) =>
      updateTriggerSubscription(subscriptionId, { enabled }),
    [updateTriggerSubscription],
  );

  return {
    triggers: triggerCatalog,
    subscriptions,
    isLoadingTriggers: triggerCatalogLoading,
    isLoadingSubscriptions,
    refetchSubscriptions,
    loadTriggerCatalogIfNeeded,
    createSubscription: createTriggerSubscription,
    updateSubscription: updateTriggerSubscription,
    toggleSubscription,
    deleteSubscription: deleteTriggerSubscription,
    testSubscription: testTriggerSubscription,
  };
}

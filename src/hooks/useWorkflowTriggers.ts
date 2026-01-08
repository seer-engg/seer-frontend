import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { useIntegrationStore } from '@/stores/integrationStore';
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
  const {
    triggerCatalog,
    triggerCatalogLoading,
    triggerSubscriptions,
    triggerSubscriptionsLoading,
    loadTriggerCatalog,
    loadTriggerSubscriptions,
    createTriggerSubscription,
    updateTriggerSubscription,
    deleteTriggerSubscription,
    testTriggerSubscription,
  } = useIntegrationStore(
    useShallow((state) => ({
      triggerCatalog: state.triggerCatalog,
      triggerCatalogLoading: state.triggerCatalogLoading,
      triggerSubscriptions: state.triggerSubscriptions,
      triggerSubscriptionsLoading: state.triggerSubscriptionsLoading,
      loadTriggerCatalog: state.loadTriggerCatalog,
      loadTriggerSubscriptions: state.loadTriggerSubscriptions,
      createTriggerSubscription: state.createTriggerSubscription,
      updateTriggerSubscription: state.updateTriggerSubscription,
      deleteTriggerSubscription: state.deleteTriggerSubscription,
      testTriggerSubscription: state.testTriggerSubscription,
    })),
  );

  const subscriptions = workflowId ? triggerSubscriptions[workflowId] ?? [] : [];
  const isLoadingSubscriptions = workflowId
    ? Boolean(triggerSubscriptionsLoading[workflowId])
    : false;

  useEffect(() => {
    if (!triggerCatalog.length && !triggerCatalogLoading) {
      void loadTriggerCatalog().catch(() => undefined);
    }
  }, [triggerCatalog.length, triggerCatalogLoading, loadTriggerCatalog]);

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
    createSubscription: createTriggerSubscription,
    updateSubscription: updateTriggerSubscription,
    toggleSubscription,
    deleteSubscription: deleteTriggerSubscription,
    testSubscription: testTriggerSubscription,
  };
}

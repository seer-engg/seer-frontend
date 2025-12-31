import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTriggerSubscription,
  deleteTriggerSubscription,
  listTriggerSubscriptions,
  listTriggers,
  testTriggerSubscription,
  updateTriggerSubscription,
} from '@/lib/workflow-triggers';
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

interface UpdatePayload {
  subscriptionId: number;
  payload: TriggerSubscriptionUpdateRequest;
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

const catalogQueryKey = ['workflow-triggers', 'catalog'];
const subscriptionQueryKey = (workflowId?: string | null) =>
  ['workflow-triggers', 'subscriptions', workflowId ?? 'none'] as const;

export function useWorkflowTriggers(workflowId?: string | null): UseWorkflowTriggersResult {
  const queryClient = useQueryClient();

  const { data: triggerCatalog, isLoading: isLoadingTriggers } = useQuery({
    queryKey: catalogQueryKey,
    queryFn: listTriggers,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: subscriptions,
    isLoading: isLoadingSubscriptions,
    refetch: refetchSubscriptions,
  } = useQuery({
    queryKey: subscriptionQueryKey(workflowId ?? undefined),
    queryFn: () => listTriggerSubscriptions(workflowId ?? undefined),
    enabled: Boolean(workflowId),
  });

  const invalidateSubscriptions = useCallback(() => {
    if (!workflowId) {
      return Promise.resolve();
    }
    return queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(workflowId) });
  }, [queryClient, workflowId]);

  const createMutation = useMutation({
    mutationFn: (payload: TriggerSubscriptionCreateRequest) => createTriggerSubscription(payload),
    onSuccess: () => {
      void invalidateSubscriptions();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ subscriptionId, payload }: UpdatePayload) =>
      updateTriggerSubscription(subscriptionId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<TriggerSubscriptionResponse[]>(
        subscriptionQueryKey(workflowId ?? undefined),
        (existing = []) => existing.map((sub) => (sub.subscription_id === updated.subscription_id ? updated : sub)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (subscriptionId: number) => deleteTriggerSubscription(subscriptionId),
    onSuccess: () => {
      void invalidateSubscriptions();
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ subscriptionId, payload }: TestPayload) =>
      testTriggerSubscription(subscriptionId, payload),
  });

  return {
    triggers: triggerCatalog ?? [],
    subscriptions: subscriptions ?? [],
    isLoadingTriggers,
    isLoadingSubscriptions,
    refetchSubscriptions: () => refetchSubscriptions().then((res) => res.data),
    createSubscription: (payload) => createMutation.mutateAsync(payload),
    updateSubscription: (subscriptionId, payload) =>
      updateMutation.mutateAsync({ subscriptionId, payload }),
    toggleSubscription: ({ subscriptionId, enabled }) =>
      updateMutation.mutateAsync({ subscriptionId, payload: { enabled } }),
    deleteSubscription: (subscriptionId) => deleteMutation.mutateAsync(subscriptionId),
    testSubscription: (payload) => testMutation.mutateAsync(payload),
  };
}


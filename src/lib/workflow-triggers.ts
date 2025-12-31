import { backendApiClient } from '@/lib/api-client';
import type {
  TriggerCatalogResponse,
  TriggerDescriptor,
  TriggerSubscriptionCreateRequest,
  TriggerSubscriptionListResponse,
  TriggerSubscriptionResponse,
  TriggerSubscriptionTestRequest,
  TriggerSubscriptionTestResponse,
  TriggerSubscriptionUpdateRequest,
} from '@/types/triggers';

export async function listTriggers(): Promise<TriggerDescriptor[]> {
  const response = await backendApiClient.request<TriggerCatalogResponse>('/api/v1/triggers');
  return response.triggers;
}

export async function listTriggerSubscriptions(workflowId?: string): Promise<TriggerSubscriptionResponse[]> {
  const searchParams = new URLSearchParams();
  if (workflowId) {
    searchParams.set('workflow_id', workflowId);
  }

  const endpoint = searchParams.size > 0
    ? `/api/v1/trigger-subscriptions?${searchParams.toString()}`
    : '/api/v1/trigger-subscriptions';

  const response = await backendApiClient.request<TriggerSubscriptionListResponse>(endpoint);
  return response.items;
}

export async function createTriggerSubscription(
  payload: TriggerSubscriptionCreateRequest,
): Promise<TriggerSubscriptionResponse> {
  return backendApiClient.request<TriggerSubscriptionResponse>('/api/v1/trigger-subscriptions', {
    method: 'POST',
    body: payload,
  });
}

export async function updateTriggerSubscription(
  subscriptionId: number,
  payload: TriggerSubscriptionUpdateRequest,
): Promise<TriggerSubscriptionResponse> {
  return backendApiClient.request<TriggerSubscriptionResponse>(
    `/api/v1/trigger-subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export async function deleteTriggerSubscription(subscriptionId: number): Promise<void> {
  await backendApiClient.request(`/api/v1/trigger-subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

export async function testTriggerSubscription(
  subscriptionId: number,
  payload: TriggerSubscriptionTestRequest,
): Promise<TriggerSubscriptionTestResponse> {
  return backendApiClient.request<TriggerSubscriptionTestResponse>(
    `/api/v1/trigger-subscriptions/${subscriptionId}/test`,
    {
      method: 'POST',
      body: payload,
    },
  );
}





import type { JsonObject } from '@/types/workflow-spec';

export interface TriggerDescriptor {
  key: string;
  title: string;
  provider: string;
  mode: string;
  description?: string | null;
  event_schema: JsonObject;
  filter_schema?: JsonObject | null;
  config_schema?: JsonObject | null;
  sample_event?: JsonObject | null;
  metadata?: Record<string, unknown> | null;
}

export interface TriggerCatalogResponse {
  triggers: TriggerDescriptor[];
}

export interface TriggerSubscriptionBase {
  provider_connection_id?: number | null;
  enabled?: boolean;
  filters?: JsonObject;
  bindings?: JsonObject;
  provider_config?: JsonObject;
}

export interface TriggerSubscriptionCreateRequest extends TriggerSubscriptionBase {
  workflow_id: string;
  trigger_key: string;
}

export type TriggerSubscriptionUpdateRequest = TriggerSubscriptionBase;

export interface TriggerSubscriptionResponse {
  subscription_id: number;
  workflow_id: string;
  trigger_key: string;
  provider_connection_id?: number | null;
  enabled: boolean;
  filters: JsonObject;
  bindings: JsonObject;
  provider_config: JsonObject;
  secret_token?: string | null;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerSubscriptionListResponse {
  items: TriggerSubscriptionResponse[];
}

export interface TriggerSubscriptionTestRequest {
  event?: JsonObject;
}

export interface TriggerSubscriptionTestResponse {
  inputs: JsonObject;
  errors: string[];
}


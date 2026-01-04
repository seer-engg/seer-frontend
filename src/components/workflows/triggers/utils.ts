import type { InputDef, JsonValue } from '@/types/workflow-spec';
import type { TriggerSubscriptionResponse } from '@/types/triggers';

export type BindingMode = 'event' | 'literal';

export interface BindingConfig {
  mode: BindingMode;
  value: string;
}

export interface BindingState {
  [inputName: string]: BindingConfig;
}

export interface GmailConfigState {
  labelIds: string;
  query: string;
  maxResults: string;
  overlapMs: string;
}

const EVENT_PREFIX = 'event.';

export const makeDefaultGmailConfig = (): GmailConfigState => ({
  labelIds: 'INBOX',
  query: '',
  maxResults: '25',
  overlapMs: '300000',
});

export function buildDefaultBindingState(workflowInputs: Record<string, InputDef>): BindingState {
  return Object.keys(workflowInputs).reduce<BindingState>((acc, inputName) => {
    acc[inputName] = {
      mode: 'event',
      value: `data.${inputName}`,
    };
    return acc;
  }, {});
}

const isEventExpression = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().startsWith('${event.');
};

const stripEventExpression = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('${') || !trimmed.endsWith('}')) {
    return trimmed;
  }
  const inner = trimmed.slice(2, -1);
  if (inner.startsWith(EVENT_PREFIX)) {
    return inner.slice(EVENT_PREFIX.length);
  }
  return inner;
};

export function deriveBindingStateFromSubscription(
  workflowInputs: Record<string, InputDef>,
  subscription: TriggerSubscriptionResponse,
): BindingState {
  const defaults = buildDefaultBindingState(workflowInputs);
  const bindings = subscription.bindings ?? {};

  return Object.keys(workflowInputs).reduce<BindingState>((acc, inputName) => {
    const existing = bindings[inputName];
    if (isEventExpression(existing)) {
      acc[inputName] = {
        mode: 'event',
        value: stripEventExpression(existing),
      };
      return acc;
    }

    if (existing !== undefined && existing !== null) {
      acc[inputName] = {
        mode: 'literal',
        value: typeof existing === 'string' ? existing : JSON.stringify(existing),
      };
      return acc;
    }

    acc[inputName] = defaults[inputName] ?? { mode: 'event', value: '' };
    return acc;
  }, defaults);
}

export function sanitizeEventExpression(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
    return trimmed;
  }
  const normalized = trimmed.startsWith(EVENT_PREFIX)
    ? trimmed
    : `${EVENT_PREFIX}${trimmed.replace(/^\.*/, '')}`;
  return `\${${normalized}}`;
}

const coerceLiteralValue = (rawValue: string): JsonValue => {
  const value = rawValue.trim();
  if (!value.length) {
    return '';
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value === numeric.toString()) {
    return numeric;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export function buildBindingsPayload(bindingState: BindingState): Record<string, JsonValue> {
  return Object.entries(bindingState).reduce<Record<string, JsonValue>>((acc, [inputName, config]) => {
    if (!config?.value) {
      return acc;
    }
    if (config.mode === 'event') {
      const expression = sanitizeEventExpression(config.value);
      if (expression) {
        acc[inputName] = expression;
      }
      return acc;
    }
    acc[inputName] = coerceLiteralValue(config.value);
    return acc;
  }, {});
}

export function buildDefaultBindings(workflowInputs: Record<string, InputDef>): Record<string, JsonValue> {
  const bindingState = buildDefaultBindingState(workflowInputs);
  return buildBindingsPayload(bindingState);
}

export function buildGmailConfigFromProviderConfig(
  providerConfig?: Record<string, any> | null,
): GmailConfigState {
  if (!providerConfig) {
    return makeDefaultGmailConfig();
  }
  const labelIdsValue = providerConfig['label_ids'];
  const labelIds = Array.isArray(labelIdsValue) ? labelIdsValue.join(', ') : providerConfig['label_ids'] ?? 'INBOX';
  return {
    labelIds: String(labelIds || 'INBOX'),
    query: String(providerConfig['query'] ?? ''),
    maxResults: String(providerConfig['max_results'] ?? '25'),
    overlapMs: String(providerConfig['overlap_ms'] ?? '300000'),
  };
}

export function serializeGmailConfig(state: GmailConfigState): Record<string, JsonValue> {
  const providerConfig: Record<string, JsonValue> = {};
  const labels = state.labelIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (labels.length) {
    providerConfig.label_ids = labels;
  }
  const query = state.query.trim();
  if (query) {
    providerConfig.query = query;
  }
  const maxResultsValue = Number.parseInt(state.maxResults, 10);
  if (!Number.isNaN(maxResultsValue)) {
    providerConfig.max_results = Math.min(Math.max(maxResultsValue, 1), 25);
  }
  const overlapMsValue = Number.parseInt(state.overlapMs, 10);
  if (!Number.isNaN(overlapMsValue)) {
    providerConfig.overlap_ms = Math.min(Math.max(overlapMsValue, 0), 900000);
  }
  return providerConfig;
}


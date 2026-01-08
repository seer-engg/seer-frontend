import type { FunctionBlockSchema, GmailIntegrationContext, SupabaseIntegrationContext, WorkflowNodeData } from '@/components/workflows/types';
import { GMAIL_TRIGGER_KEY, SUPABASE_TRIGGER_KEY } from '@/components/workflows/triggers/constants';

/**
 * Generate unique node ID based on type
 */
export function generateNodeId(type: 'trigger' | 'block'): string {
  return `${type === 'trigger' ? 'trigger' : 'node'}-${Date.now()}`;
}

/**
 * Apply default configuration for a given block type
 */
export function withDefaultBlockConfig(
  blockType: string,
  config: Record<string, unknown> | undefined,
  functionBlocksMap: Map<string, FunctionBlockSchema>
): Record<string, unknown> {
  const blockSchema = functionBlocksMap.get(blockType);

  if (!blockSchema) {
    return config || {};
  }

  const defaults: Record<string, unknown> = {};

  // Apply defaults from schema properties
  if (blockSchema.config_schema && typeof blockSchema.config_schema === 'object') {
    const schema = blockSchema.config_schema as { properties?: Record<string, unknown> };
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const propSchema = value as Record<string, unknown>;
        if ('default' in propSchema) {
          defaults[key] = propSchema.default;
        }
      }
    }
  }

  // Merge with provided config (config takes precedence)
  return {
    ...defaults,
    ...(config || {}),
  };
}

/**
 * Build integration metadata for trigger nodes
 */
export function buildIntegrationMetadata(
  triggerKey: string,
  gmailIntegration?: GmailIntegrationContext,
  supabaseIntegration?: SupabaseIntegrationContext
): NonNullable<WorkflowNodeData['triggerMeta']>['integration'] {
  const integrationMeta: NonNullable<WorkflowNodeData['triggerMeta']>['integration'] = {};

  if (triggerKey === GMAIL_TRIGGER_KEY && gmailIntegration) {
    integrationMeta.gmail = {
      ready: gmailIntegration.ready,
      connectionId: gmailIntegration.connectionId,
      onConnect: gmailIntegration.ready ? undefined : gmailIntegration.onConnect,
      isConnecting: gmailIntegration.isConnecting,
    };
  }

  if (triggerKey === SUPABASE_TRIGGER_KEY && supabaseIntegration) {
    integrationMeta.supabase = {
      ready: supabaseIntegration.ready,
      onConnect: supabaseIntegration.ready ? undefined : supabaseIntegration.onConnect,
      isConnecting: supabaseIntegration.isConnecting,
    };
  }

  return Object.keys(integrationMeta).length ? integrationMeta : undefined;
}

/**
 * Create trigger node data structure
 */
export function createTriggerNodeData(options: {
  triggerKey: string;
  label: string;
  descriptor: { title?: string };
  workflowInputs: Record<string, unknown>;
  integrationMeta?: NonNullable<WorkflowNodeData['triggerMeta']>['integration'];
}): WorkflowNodeData {
  const { triggerKey, label, descriptor, workflowInputs, integrationMeta } = options;

  return {
    type: 'trigger',
    label: descriptor.title || label,
    config: {
      triggerKey,
    },
    triggerMeta: {
      descriptor,
      workflowInputs,
      handlers: {}, // Will be populated when trigger nodes are created
      integration: integrationMeta,
    },
  };
}

/**
 * Create regular block node data structure
 */
export function createBlockNodeData(options: {
  type: string;
  label: string;
  config: Record<string, unknown>;
}): WorkflowNodeData {
  const { type, label, config } = options;

  return {
    type: type as WorkflowNodeData['type'],
    label,
    config,
  };
}

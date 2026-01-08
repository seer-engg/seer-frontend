import type { FunctionBlockSchema, GmailIntegrationContext, SupabaseIntegrationContext, WorkflowNodeData } from '@/components/workflows/types';
import { GMAIL_TRIGGER_KEY, SUPABASE_TRIGGER_KEY } from '@/components/workflows/triggers/constants';

const DEFAULT_LLM_USER_PROMPT = 'Enter your prompt here';

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
  config: Record<string, unknown> = {},
  functionBlockMap?: Map<string, FunctionBlockSchema>,
): Record<string, unknown> {
  const schemaDefaults = functionBlockMap?.get(blockType)?.defaults;
  const defaults: Record<string, unknown> = schemaDefaults ?? (() => {
    switch (blockType) {
      case 'llm':
        return {
          system_prompt: '',
          user_prompt: DEFAULT_LLM_USER_PROMPT,
          model: 'gpt-5-mini',
          temperature: 0.2,
        };
      case 'if_else':
        return {
          condition: '',
        };
      case 'for_loop':
        return {
          array_mode: 'variable',
          array_variable: 'items',
          array_literal: [],
          item_var: 'item',
        };
      case 'trigger':
        // Triggers have their config passed directly
        return {};
      default:
        return {};
    }
  })();

  return {
    ...defaults,
    ...config,
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

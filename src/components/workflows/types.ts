import { Edge, Node } from '@xyflow/react';

import type { InputDef } from '@/types/workflow-spec';
import type {
  TriggerDescriptor,
  TriggerSubscriptionResponse,
  TriggerSubscriptionUpdateRequest,
} from '@/types/triggers';
import type { BindingState, GmailConfigState, SupabaseConfigState, CronConfigState } from './triggers/utils';

export type BlockType =
  | 'tool'
  | 'code'
  | 'llm'
  | 'if_else'
  | 'for_loop';

export type CanvasNodeType = BlockType | 'trigger';

export interface FunctionBlockSchema {
  type: BlockType;
  label: string;
  category: string;
  description: string;
  defaults: Record<string, unknown>;
  config_schema: Record<string, unknown>;
  tags?: string[] | null;
}
export interface TriggerNodeHandlers {
  update?: (subscriptionId: number, payload: TriggerSubscriptionUpdateRequest) => Promise<void>;
  toggle?: (subscriptionId: number, enabled: boolean) => Promise<void>;
  delete?: (subscriptionId: number) => Promise<void>;
  saveDraft?: (
    draftId: string,
    payload: {
      triggerKey: string;
      bindings: BindingState;
      providerConfig?: Record<string, unknown>;
    },
  ) => Promise<void>;
  discardDraft?: (draftId: string) => void;
  updateWorkflowInputs?: (nextInputs: Record<string, InputDef>) => Promise<void>;
}

export interface GmailIntegrationContext {
  ready: boolean;
  connectionId?: number | null;
  onConnect?: () => Promise<void> | void;
  isConnecting?: boolean;
}

export interface SupabaseIntegrationContext {
  ready: boolean;
  onConnect?: () => Promise<void> | void;
  isConnecting?: boolean;
}

export interface TriggerDraftMeta {
  id: string;
  triggerKey: string;
  initialBindings: BindingState;
  initialProviderConfig?: Record<string, unknown>;
  initialGmailConfig?: GmailConfigState;
  initialCronConfig?: CronConfigState;
  initialSupabaseConfig?: SupabaseConfigState;
}

export interface TriggerNodeMeta {
  subscription?: TriggerSubscriptionResponse;
  descriptor?: TriggerDescriptor;
  workflowInputs: Record<string, InputDef>;
  handlers: TriggerNodeHandlers;
  integration?: {
    gmail?: GmailIntegrationContext;
    supabase?: SupabaseIntegrationContext;
  };
  draft?: TriggerDraftMeta;
}

import { ToolBlockConfig } from '@/components/workflows/block-config/types';

export interface WorkflowNodeData extends Record<string, unknown> {
  type: CanvasNodeType;
  label: string;
  config?: ToolBlockConfig;
  oauth_scope?: string;
  selected?: boolean;
  onSelect?: () => void;
  triggerMeta?: TriggerNodeMeta;
}

// Minimal payload used when creating/dropping a new block onto the canvas
export type DroppedBlockData = Pick<WorkflowNodeData, 'type' | 'label' | 'config'>;

export interface WorkflowNodeUpdateOptions {
  /**
   * When true, the caller expects the graph to be persisted immediately
   * (instead of waiting for the debounced autosave cycle).
   */
  persist?: boolean;
}

export type WorkflowEdgeData = {
  branch?: 'true' | 'false' | 'loop' | 'exit';
};

export type WorkflowEdge = Edge<WorkflowEdgeData>;

export function getNextBranchForSource(
  sourceId: string | null | undefined,
  nodes: Node<WorkflowNodeData>[],
  edges: WorkflowEdge[],
): 'true' | 'false' | 'loop' | 'exit' | undefined {
  if (!sourceId) {
    return undefined;
  }

  const sourceNode = nodes.find((node) => node.id === sourceId);
  if (!sourceNode) {
    return undefined;
  }

  const outgoing = edges.filter((edge) => edge.source === sourceId);
  if (sourceNode.type === 'if_else') {
    const hasTrue = outgoing.some((edge) => edge.data?.branch === 'true');
    const hasFalse = outgoing.some((edge) => edge.data?.branch === 'false');
    if (!hasTrue) {
      return 'true';
    }
    if (!hasFalse) {
      return 'false';
    }
    return undefined;
  }

  if (sourceNode.type === 'for_loop') {
    const hasLoop = outgoing.some((edge) => edge.data?.branch === 'loop');
    const hasExit = outgoing.some((edge) => edge.data?.branch === 'exit');
    if (!hasLoop) {
      return 'loop';
    }
    if (!hasExit) {
      return 'exit';
    }
    return undefined;
  }

  return undefined;
}



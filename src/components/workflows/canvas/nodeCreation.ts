import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, TriggerCatalogEntry } from '@/components/workflows/types';
import type { BlockSelectionPayload } from '@/types/block-selection';
import type { InputDef } from '@/types/workflow-spec';
import { withDefaultBlockConfig as withDefaults, generateNodeId } from '@/lib/workflow-nodes';
import { GMAIL_TRIGGER_KEY } from '@/components/workflows/triggers/constants';

export interface TriggerNodeCreationParams {
  triggerKey: string;
  descriptor: TriggerCatalogEntry;
  label: string;
  workflowInputsDef: Record<string, InputDef>;
  gmailIntegrationReady: boolean;
  gmailConnectionId: number | null;
  handleConnectGmail: () => void;
  isConnectingGmail: boolean;
  position: { x: number; y: number };
}

export function createTriggerNode(params: TriggerNodeCreationParams): Node<WorkflowNodeData> {
  const {
    triggerKey,
    descriptor,
    label,
    workflowInputsDef,
    gmailIntegrationReady,
    gmailConnectionId,
    handleConnectGmail,
    isConnectingGmail,
    position,
  } = params;

  const integrationMeta: NonNullable<WorkflowNodeData['triggerMeta']>['integration'] = {};
  if (triggerKey === GMAIL_TRIGGER_KEY) {
    integrationMeta.gmail = {
      ready: gmailIntegrationReady,
      connectionId: gmailConnectionId,
      onConnect: gmailIntegrationReady ? undefined : handleConnectGmail,
      isConnecting: isConnectingGmail,
    };
  }

  return {
    id: generateNodeId('trigger'),
    type: 'trigger',
    position,
    data: {
      type: 'trigger',
      label: descriptor.title || label,
      config: {
        triggerKey,
      },
      triggerMeta: {
        descriptor,
        workflowInputs: workflowInputsDef,
        handlers: {} as Record<string, (data: unknown) => void>,
        integration: Object.keys(integrationMeta).length ? integrationMeta : undefined,
      },
    },
  };
}

export function createRegularBlockNode(
  block: BlockSelectionPayload,
  position: { x: number; y: number },
  functionBlocksMap: Map<string, unknown>,
): Node<WorkflowNodeData> {
  const defaultConfig = withDefaults(block.type, block.config, functionBlocksMap);

  return {
    id: generateNodeId('block'),
    type: block.type as WorkflowNodeData['type'],
    position,
    data: {
      type: block.type as WorkflowNodeData['type'],
      label: block.label,
      config: defaultConfig,
    },
  };
}

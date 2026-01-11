import { BackendAPIError } from '@/lib/api-client';
import { workflowSpecToGraph } from '@/lib/workflow-graph';
import { toast } from '@/components/ui/sonner';
import type { ChatMessage, WorkflowProposal } from '../buildtypes';
import type { JsonObject } from '@/types/workflow-spec';
import type { Node, Edge } from '@xyflow/react';
import { getDisplayableAssistantMessage } from '../utils';

export function updateSessionIds(params: {
  sessionId?: number;
  threadId?: string;
  currentSessionId: number | null;
  currentThreadId: string | null;
  setCurrentSessionId: (id: number) => void;
  setCurrentThreadId: (id: string) => void;
}) {
  if (params.sessionId && params.sessionId !== params.currentSessionId) {
    params.setCurrentSessionId(params.sessionId);
  }
  if (params.threadId && params.threadId !== params.currentThreadId) {
    params.setCurrentThreadId(params.threadId);
  }
}

export function handleProposalResponse(
  proposal: WorkflowProposal | null | undefined,
  proposalError: string | null | undefined,
  setProposalPreview: (preview: { proposal: WorkflowProposal; graph: ReturnType<typeof workflowSpecToGraph> } | null) => void,
) {
  if (!proposal || !proposal.spec || proposalError) {
    setProposalPreview(null);
    return;
  }

  try {
    const previewGraph = workflowSpecToGraph(proposal.spec);
    setProposalPreview({ proposal, graph: previewGraph });
  } catch (graphError) {
    console.error('Failed to build workflow preview from proposal:', graphError);
    toast.error('Failed to preview workflow proposal');
    setProposalPreview(null);
  }
}

export function createAssistantMessage(params: {
  response: string;
  proposal?: WorkflowProposal | null;
  proposalError?: string | null;
  thinking?: string[];
  interruptRequired?: boolean;
  interruptData?: JsonObject;
  selectedModel: string | null;
}): ChatMessage {
  const displayContent = getDisplayableAssistantMessage(params.response, params.proposal?.summary);
  return {
    role: 'assistant',
    content: displayContent,
    proposal: params.proposal || undefined,
    proposalError: params.proposalError || undefined,
    thinking: params.thinking,
    interruptRequired: params.interruptRequired,
    interruptData: params.interruptData,
    timestamp: new Date(),
    model: params.selectedModel,
  };
}

export function isTimeoutError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (error instanceof BackendAPIError && error.status === 504)
  );
}

export function createErrorMessage(error: unknown): ChatMessage {
  const content = isTimeoutError(error)
    ? 'Request timed out. Please try again with a shorter message.'
    : 'Sorry, I encountered an error. Please try again.';
  return { role: 'assistant', content, timestamp: new Date() };
}

export function prepareWorkflowState(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data, position: n.position })),
    edges: edges.map((e) => {
      const branch = e.data?.branch;
      return { id: e.id, source: e.source, target: e.target, ...(branch ? { data: { branch } } : {}) };
    }),
  };
}

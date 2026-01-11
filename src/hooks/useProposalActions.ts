import { useCallback } from 'react';
import { toast } from '@/components/ui/sonner';
import { backendApiClient } from '@/lib/api-client';
import { workflowSpecToGraph } from '@/lib/workflow-graph';
import { useChatStore } from '@/stores';
import type { ChatMessage, WorkflowProposal, WorkflowProposalActionResponse } from '@/components/workflows/buildtypes';

export function useProposalActions(
  workflowId: string | null,
  onWorkflowGraphSync?: (graph: ReturnType<typeof workflowSpecToGraph>) => void,
) {
  const setMessages = useChatStore((state) => state.setMessages);
  const setProposalActionLoading = useChatStore((state) => state.setProposalActionLoading);

  const updateProposalInMessages = useCallback(
    (updatedProposal: WorkflowProposal) => {
      setMessages((prev: ChatMessage[]) =>
        prev.map((message) =>
          message.proposal?.id === updatedProposal.id ? { ...message, proposal: updatedProposal } : message,
        ),
      );
    },
    [setMessages],
  );

  const handleAcceptProposal = useCallback(
    async (proposalId: number) => {
      if (!workflowId) return;
      setProposalActionLoading(proposalId);
      try {
        const response = await backendApiClient.request<WorkflowProposalActionResponse>(
          `/api/workflow-agent/${workflowId}/proposals/${proposalId}/accept`,
          { method: 'POST' },
        );
        updateProposalInMessages(response.proposal);
        const specGraph = response.proposal?.spec ? workflowSpecToGraph(response.proposal.spec) : null;
        if (specGraph) {
          onWorkflowGraphSync?.(specGraph);
        } else if (response.workflow_graph) {
          onWorkflowGraphSync?.(response.workflow_graph);
        }
        toast.success('Proposal accepted');
        return response;
      } catch (error) {
        console.error('Failed to accept proposal:', error);
        toast.error('Failed to accept proposal');
      } finally {
        setProposalActionLoading(null);
      }
    },
    [workflowId, setProposalActionLoading, updateProposalInMessages, onWorkflowGraphSync],
  );

  const handleRejectProposal = useCallback(
    async (proposalId: number) => {
      if (!workflowId) return;
      setProposalActionLoading(proposalId);
      try {
        const response = await backendApiClient.request<WorkflowProposalActionResponse>(
          `/api/workflows/${workflowId}/proposals/${proposalId}/reject`,
          { method: 'POST' },
        );
        updateProposalInMessages(response.proposal);
        toast.success('Proposal rejected');
        return response;
      } catch (error) {
        console.error('Failed to reject proposal:', error);
        toast.error('Failed to reject proposal');
      } finally {
        setProposalActionLoading(null);
      }
    },
    [workflowId, setProposalActionLoading, updateProposalInMessages],
  );

  return {
    handleAcceptProposal,
    handleRejectProposal,
  };
}

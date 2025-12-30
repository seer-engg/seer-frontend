import { useQuery } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';

import type { ChatMessage, WorkflowProposal } from '../types';

type SessionMessageResponse = {
  id: number;
  role: string;
  content: string;
  thinking?: string;
  proposal?: WorkflowProposal | null;
  created_at: string;
};

type ChatSessionMessagesResponse = {
  id: number;
  messages: SessionMessageResponse[];
};

export function useChatMessages(workflowId: string | null, currentSessionId: number | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat-session-messages', currentSessionId],
    queryFn: async () => {
      if (!workflowId || !currentSessionId) return [];
      const response = await backendApiClient.request<ChatSessionMessagesResponse>(
        `/api/workflow-agent/${workflowId}/chat/sessions/${currentSessionId}`,
        {
          method: 'GET',
        },
      );
      return response.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        thinking: msg.thinking ? msg.thinking.split('\n') : undefined,
        proposal: msg.proposal || undefined,
        proposalError: undefined,
        timestamp: new Date(msg.created_at),
      }));
    },
    enabled: !!currentSessionId && !!workflowId,
  });
}


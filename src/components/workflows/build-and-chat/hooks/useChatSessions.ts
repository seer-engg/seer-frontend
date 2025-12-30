import { useInfiniteQuery } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';

import type { ChatSession } from '../types';

export function useChatSessions(workflowId: string | null) {
  return useInfiniteQuery<ChatSession[]>({
    queryKey: ['chat-sessions', workflowId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!workflowId) return [];
      // const response = await backendApiClient.request<ChatSession[]>(
      //   `/api/workflows/${workflowId}/chat/sessions?offset=${pageParam}&limit=50`,
      //   { method: 'GET' },
      // );
      return [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 50) {
        return undefined;
      }
      return (lastPageParam as number) + 50;
    },
    enabled: !!workflowId,
  });
}


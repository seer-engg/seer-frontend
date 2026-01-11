import { useEffect } from 'react';
import { useChatMessages } from './useChatMessages';
import { useChatSessions } from './useChatSessions';
import { useChatStore } from '@/stores';

export function useChatSessionData(workflowId: string | null) {
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const setMessages = useChatStore((state) => state.setMessages);
  const sessionsQuery = useChatSessions(workflowId);
  const sessions = sessionsQuery.data?.pages.flatMap((page) => page) ?? [];
  const { data: sessionMessages } = useChatMessages(workflowId, currentSessionId);

  useEffect(() => {
    if (sessionMessages) setMessages(sessionMessages);
  }, [sessionMessages, setMessages]);

  return { sessions, sessionsQuery };
}

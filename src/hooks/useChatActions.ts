import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendApiClient } from '@/lib/api-client';
import { useChatStore, useUIStore } from '@/stores';
import type { ChatMessage, ChatSession, WorkflowProposal } from '@/components/workflows/buildtypes';
import type { JsonObject } from '@/types/workflow-spec';
import type { Node, Edge } from '@xyflow/react';
import {
  updateSessionIds,
  handleProposalResponse,
  createAssistantMessage,
  createErrorMessage,
  prepareWorkflowState,
} from '@/components/workflows/panels/buildAndChatPanelHelpers';

export function useChatActions(workflowId: string | null, nodes: Node[], edges: Edge[]) {
  const queryClient = useQueryClient();

  const input = useChatStore((state) => state.input);
  const isLoading = useChatStore((state) => state.isLoading);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const currentThreadId = useChatStore((state) => state.currentThreadId);
  const setMessages = useChatStore((state) => state.setMessages);
  const setInput = useChatStore((state) => state.setInput);
  const setIsLoading = useChatStore((state) => state.setIsLoading);
  const setCurrentSessionId = useChatStore((state) => state.setCurrentSessionId);
  const setCurrentThreadId = useChatStore((state) => state.setCurrentThreadId);
  const clearMessages = useChatStore((state) => state.clearMessages);

  const setProposalPreview = useUIStore((state) => state.setProposalPreview);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !workflowId || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      model: selectedModel,
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    const messageContent = input.trim();
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await backendApiClient.request<{
        response: string;
        proposal?: WorkflowProposal | null;
        proposal_error?: string | null;
        session_id?: number;
        thread_id?: string;
        thinking?: string[];
        interrupt_required?: boolean;
        interrupt_data?: JsonObject;
      }>(`/api/workflow-agent/${workflowId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageContent,
          model: selectedModel,
          session_id: currentSessionId || undefined,
          thread_id: currentThreadId || undefined,
          resume_thread: true,
          workflow_state: prepareWorkflowState(nodes, edges),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      updateSessionIds({
        sessionId: response.session_id,
        threadId: response.thread_id,
        currentSessionId,
        currentThreadId,
        setCurrentSessionId,
        setCurrentThreadId,
      });
      handleProposalResponse(response.proposal, response.proposal_error, setProposalPreview);

      const assistantMessage = createAssistantMessage({
        response: response.response,
        proposal: response.proposal,
        proposalError: response.proposal_error,
        thinking: response.thinking,
        interruptRequired: response.interrupt_required,
        interruptData: response.interrupt_data,
        selectedModel,
      });

      setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to send chat message:', error);

      const errorMessage = createErrorMessage(error);
      setMessages((prev: ChatMessage[]) => [...prev, errorMessage]);
      setProposalPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    workflowId,
    isLoading,
    selectedModel,
    currentSessionId,
    currentThreadId,
    nodes,
    edges,
    setMessages,
    setInput,
    setIsLoading,
    setCurrentSessionId,
    setCurrentThreadId,
    setProposalPreview,
    queryClient,
  ]);

  const handleNewSession = useCallback(async () => {
    if (!workflowId) return;
    try {
      const response = await backendApiClient.request<ChatSession>(
        `/api/workflow-agent/${workflowId}/chat/sessions`,
        {
          method: 'POST',
          body: JSON.stringify({ title: null }),
        },
      );
      setCurrentSessionId(response.id);
      setCurrentThreadId(response.thread_id);
      clearMessages();
      setProposalPreview(null);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [workflowId, setCurrentSessionId, setCurrentThreadId, clearMessages, setProposalPreview, queryClient]);

  const handleSelectSession = useCallback(
    (sessionId: number, sessions: ChatSession[]) => {
      setCurrentSessionId(sessionId);
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        setCurrentThreadId(session.thread_id);
      }
      setProposalPreview(null);
    },
    [setCurrentSessionId, setCurrentThreadId, setProposalPreview],
  );

  return {
    handleSend,
    handleNewSession,
    handleSelectSession,
  };
}

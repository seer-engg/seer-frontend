import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';

import { backendApiClient, BackendAPIError } from '@/lib/api-client';

import { BuildPanel } from './build-and-chat/build/BuildPanel';
import { ChatPanel } from './build-and-chat/chat/ChatPanel';
import type { SessionsStatus } from './build-and-chat/chat/types';
import { useChatMessages } from './build-and-chat/hooks/useChatMessages';
import { useChatSessions } from './build-and-chat/hooks/useChatSessions';
import type {
  BuildAndChatPanelProps,
  ChatMessage,
  ChatSession,
  ModelInfo,
  Tool,
  WorkflowProposal,
  WorkflowProposalActionResponse,
  BuiltInBlock,
} from './build-and-chat/types';
import { filterSystemPrompt } from './build-and-chat/utils';

export function BuildAndChatPanel({
  onBlockSelect,
  workflowId,
  nodes,
  edges,
  onWorkflowGraphSync,
  collapsed: externalCollapsed,
  onCollapseChange,
  functionBlocks,
}: BuildAndChatPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const saved = localStorage.getItem('buildChatPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const setCollapsed = (value: boolean) => {
    if (externalCollapsed === undefined) {
      setInternalCollapsed(value);
      localStorage.setItem('buildChatPanelCollapsed', JSON.stringify(value));
    }
    onCollapseChange?.(value);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [proposalActionLoading, setProposalActionLoading] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: toolsData, isLoading: isLoadingTools } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ tools: Tool[] }>('/api/tools', {
        method: 'GET',
      });
      return response;
    },
  });

  const tools = toolsData?.tools || [];

  const { data: models = [], isLoading: isLoadingModels } = useQuery<ModelInfo[]>({
    queryKey: ['available-models'],
    queryFn: async () => {
      const response = await backendApiClient.request<ModelInfo[]>('/api/models', {
        method: 'GET',
      });
      return response;
    },
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const preferredModel = models.find((m) => m.id === 'gpt-5.2' || m.id === 'gpt-5-mini') || models[0];
      setSelectedModel(preferredModel.id);
    }
  }, [models, selectedModel]);

  const sessionsQuery = useChatSessions(workflowId);
  const sessions = sessionsQuery.data?.pages.flatMap((page) => page) ?? [];

  useEffect(() => {
    if (sessionsQuery.isError && sessionsQuery.error) {
      console.error('Failed to load chat sessions:', sessionsQuery.error);
    }
  }, [sessionsQuery.isError, sessionsQuery.error]);

  const { data: sessionMessages } = useChatMessages(workflowId, currentSessionId);

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  const handleSend = async () => {
    if (!input.trim() || !workflowId || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      model: selectedModel,
    };

    setMessages((prev) => [...prev, userMessage]);
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
        interrupt_data?: Record<string, any>;
      }>(`/api/workflows/${workflowId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageContent,
          model: selectedModel,
          session_id: currentSessionId || undefined,
          thread_id: currentThreadId || undefined,
          resume_thread: true,
          workflow_state: {
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              data: n.data,
              position: n.position,
            })),
            edges: edges.map((e) => {
              const branch = e.data?.branch;
              return {
                id: e.id,
                source: e.source,
                target: e.target,
                ...(branch ? { data: { branch } } : {}),
              };
            }),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.session_id && response.session_id !== currentSessionId) {
        setCurrentSessionId(response.session_id);
      }
      if (response.thread_id && response.thread_id !== currentThreadId) {
        setCurrentThreadId(response.thread_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        proposal: response.proposal || undefined,
        proposalError: response.proposal_error || undefined,
        thinking: response.thinking,
        interruptRequired: response.interrupt_required,
        interruptData: response.interrupt_data,
        timestamp: new Date(),
        model: selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to send chat message:', error);

      const isTimeout =
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof BackendAPIError && error.status === 504);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: isTimeout
          ? 'Request timed out. Please try again with a shorter message.'
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
    if (!workflowId) return;
    try {
      const response = await backendApiClient.request<ChatSession>(
        `/api/workflows/${workflowId}/chat/sessions`,
        {
          method: 'POST',
          body: JSON.stringify({ title: null }),
        },
      );
      setCurrentSessionId(response.id);
      setCurrentThreadId(response.thread_id);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = (sessionId: number) => {
    setCurrentSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentThreadId(session.thread_id);
    }
  };

  const updateProposalInMessages = (updatedProposal: WorkflowProposal) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.proposal?.id === updatedProposal.id ? { ...message, proposal: updatedProposal } : message,
      ),
    );
  };

  const handleAcceptProposal = async (proposalId: number) => {
    if (!workflowId) return;
    setProposalActionLoading(proposalId);
    try {
      const response = await backendApiClient.request<WorkflowProposalActionResponse>(
        `/api/workflows/${workflowId}/proposals/${proposalId}/accept`,
        { method: 'POST' },
      );
      updateProposalInMessages(response.proposal);
      if (response.workflow_graph) {
        onWorkflowGraphSync?.(response.workflow_graph);
      }
      toast.success('Proposal accepted');
    } catch (error) {
      console.error('Failed to accept proposal:', error);
      toast.error('Failed to accept proposal');
    } finally {
      setProposalActionLoading(null);
    }
  };

  const handleRejectProposal = async (proposalId: number) => {
    if (!workflowId) return;
    setProposalActionLoading(proposalId);
    try {
      const response = await backendApiClient.request<WorkflowProposalActionResponse>(
        `/api/workflows/${workflowId}/proposals/${proposalId}/reject`,
        { method: 'POST' },
      );
      updateProposalInMessages(response.proposal);
      toast.success('Proposal rejected');
    } catch (error) {
      console.error('Failed to reject proposal:', error);
      toast.error('Failed to reject proposal');
    } finally {
      setProposalActionLoading(null);
    }
  };

  const sessionsStatus: SessionsStatus = {
    isPending: sessionsQuery.isPending,
    isError: sessionsQuery.isError,
    error: sessionsQuery.error,
    hasNextPage: sessionsQuery.hasNextPage,
    fetchNextPage: sessionsQuery.fetchNextPage,
    isFetchingNextPage: sessionsQuery.isFetchingNextPage,
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-start py-2 px-2 border-l">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} title="Expand Build & Chat">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l w-full">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={0} collapsible>
          <BuildPanel
            tools={tools}
            isLoadingTools={isLoadingTools}
            onBlockSelect={onBlockSelect}
            blocks={functionBlocks}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={0} collapsible>
          <ChatPanel
            workflowId={workflowId}
            messages={messages}
            isLoading={isLoading}
            input={input}
            onInputChange={(value) => setInput(value)}
            onSend={handleSend}
            selectedModel={selectedModel}
            onModelChange={(value) => setSelectedModel(value)}
            models={models}
            isLoadingModels={isLoadingModels}
            filterSystemPrompt={filterSystemPrompt}
            onNewSession={handleNewSession}
            sessions={sessions}
            sessionsStatus={sessionsStatus}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            proposalActionLoading={proposalActionLoading}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

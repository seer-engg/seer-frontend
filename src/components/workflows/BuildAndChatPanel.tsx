import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useShallow } from 'zustand/shallow';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';

import { backendApiClient, BackendAPIError } from '@/lib/api-client';
import { workflowSpecToGraph } from '@/lib/workflow-graph';

import { BuildPanel } from './build-and-chat/build/BuildPanel';
import { ChatPanel } from './build-and-chat/chat/ChatPanel';
import { ExecutionsPanel } from './build-and-chat/executions/ExecutionsPanel';
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
import { filterSystemPrompt, getDisplayableAssistantMessage } from './build-and-chat/utils';
import { useCanvasStore, useChatStore, useIntegrationStore, useUIStore } from '@/stores';

export function BuildAndChatPanel({
  onBlockSelect,
  workflowId,
  onWorkflowGraphSync,
  functionBlocks,
  triggerOptions = [],
  isLoadingTriggers = false,
  triggerInfoMessage,
}: BuildAndChatPanelProps) {
  const { nodes, edges } = useCanvasStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
    })),
  );
  const {
    buildChatPanelCollapsed,
    setBuildChatPanelCollapsed,
    proposalPreview,
    setProposalPreview,
  } = useUIStore(
    useShallow((state) => ({
      buildChatPanelCollapsed: state.buildChatPanelCollapsed,
      setBuildChatPanelCollapsed: state.setBuildChatPanelCollapsed,
      proposalPreview: state.proposalPreview,
      setProposalPreview: state.setProposalPreview,
    })),
  );

  const collapsed = buildChatPanelCollapsed;
  const activePreviewProposalId = proposalPreview?.proposal.id ?? null;

  const handleToggleCollapse = () => {
    setBuildChatPanelCollapsed(!collapsed);
  };

  const {
    input,
    isLoading,
    selectedModel,
    currentSessionId,
    currentThreadId,
    proposalActionLoading,
    setMessages,
    setInput,
    setIsLoading,
    setSelectedModel,
    setCurrentSessionId,
    setCurrentThreadId,
    setProposalActionLoading,
    clearMessages,
  } = useChatStore(
    useShallow((state) => ({
      input: state.input,
      isLoading: state.isLoading,
      selectedModel: state.selectedModel,
      currentSessionId: state.currentSessionId,
      currentThreadId: state.currentThreadId,
      proposalActionLoading: state.proposalActionLoading,
      setMessages: state.setMessages,
      setInput: state.setInput,
      setIsLoading: state.setIsLoading,
      setSelectedModel: state.setSelectedModel,
      setCurrentSessionId: state.setCurrentSessionId,
      setCurrentThreadId: state.setCurrentThreadId,
      setProposalActionLoading: state.setProposalActionLoading,
      clearMessages: state.clearMessages,
    })),
  );
  const queryClient = useQueryClient();

  // Use Integration Store for tools instead of fetching again here
  const { tools: rawTools, toolsLoading, toolsLoaded, refreshIntegrationTools } = useIntegrationStore(
    useShallow((state) => ({
      tools: state.tools,
      toolsLoading: state.toolsLoading,
      toolsLoaded: state.toolsLoaded,
      refreshIntegrationTools: state.refreshIntegrationTools,
    })),
  );

  useEffect(() => {
    if (!toolsLoaded && !toolsLoading) {
      // Triggers bootstrap/individual loads as needed and de-duplicates concurrent fetches
      void refreshIntegrationTools();
    }
  }, [toolsLoaded, toolsLoading, refreshIntegrationTools]);

  const tools: Tool[] = React.useMemo(
    () =>
      rawTools.map((t) => ({
        name: t.name,
        description: t.description,
        provider: t.provider ?? undefined,
        integration_type: (t.integration_type as string | undefined) ?? undefined,
        output_schema: (t.output_schema as Record<string, any> | null) ?? null,
      })),
    [rawTools],
  );

  const isLoadingTools = toolsLoading || !toolsLoaded;

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
      }>(`/api/workflow-agent/${workflowId}/chat`, {
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

      if (response.proposal && response.proposal.spec && !response.proposal_error) {
        try {
          const previewGraph = workflowSpecToGraph(response.proposal.spec);
          setProposalPreview({
            proposal: response.proposal,
            graph: previewGraph,
          });
        } catch (graphError) {
          console.error('Failed to build workflow preview from proposal:', graphError);
          toast.error('Failed to preview workflow proposal');
          setProposalPreview(null);
        }
      } else {
        setProposalPreview(null);
      }

      const displayContent = getDisplayableAssistantMessage(
        response.response,
        response.proposal?.summary,
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: displayContent,
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
      setProposalPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
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
  };

  const handleSelectSession = (sessionId: number) => {
    setCurrentSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentThreadId(session.thread_id);
    }
    setProposalPreview(null);
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
        `/api/workflow-agent/${workflowId}/proposals/${proposalId}/accept`,
        { method: 'POST' },
      );
      updateProposalInMessages(response.proposal);
      const specGraph =
        response.proposal?.spec ? workflowSpecToGraph(response.proposal.spec) : null;
      if (specGraph) {
        onWorkflowGraphSync?.(specGraph);
      } else if (response.workflow_graph) {
        onWorkflowGraphSync?.(response.workflow_graph);
      }
      setProposalPreview(null);
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
      setProposalPreview(null);
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

  return (
    <div className="flex flex-col h-full bg-card border-l w-full relative">
      {collapsed && (
        <div className="absolute inset-y-0 left-0 z-50 w-12 flex flex-col items-center justify-center bg-card border-r border-border pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            title="Expand Build & Chat"
            className="h-10 w-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
      <Tabs defaultValue="build" className="flex flex-col h-full">
        <div className="h-14 border-b border-border flex items-center px-4 gap-2 bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            title={collapsed ? "Show Build & Chat panel" : "Hide Build & Chat panel"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
          <TabsList className="h-9">
            <TabsTrigger value="build" className="text-xs px-3">Build</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs px-3">Chat</TabsTrigger>
            <TabsTrigger value="executions" className="text-xs px-3" disabled={!workflowId}>
              Executions
            </TabsTrigger>
          </TabsList>
          <div className="flex-1" />
        </div>

        <TabsContent value="build" className="flex-1 mt-0 overflow-hidden">
          <BuildPanel
            tools={tools}
            isLoadingTools={isLoadingTools}
            onBlockSelect={onBlockSelect}
            blocks={functionBlocks}
            selectedWorkflowId={workflowId}
            triggerOptions={triggerOptions}
            isLoadingTriggers={isLoadingTriggers}
            triggerInfoMessage={triggerInfoMessage}
          />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
          <ChatPanel
            workflowId={workflowId}
            onSend={handleSend}
            models={models}
            isLoadingModels={isLoadingModels}
            filterSystemPrompt={filterSystemPrompt}
            onNewSession={handleNewSession}
            sessions={sessions}
            sessionsStatus={sessionsStatus}
            onSelectSession={handleSelectSession}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
            activePreviewProposalId={activePreviewProposalId}
          />
        </TabsContent>

        <TabsContent value="executions" className="flex-1 mt-0 overflow-hidden">
          <ExecutionsPanel workflowId={workflowId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

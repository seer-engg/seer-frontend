import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { UnifiedBuildPanel } from '../build/UnifiedBuildPanel';
import { ChatPanel } from '../chat/ChatPanel';
import { ExecutionsPanel } from '../executions/ExecutionsPanel';
import { useChatActions } from '../../../hooks/useChatActions';
import { useProposalActions } from '../../../hooks/useProposalActions';
import { useWorkflowTools } from '../../../hooks/useWorkflowTools';
import { useAvailableModels } from '../../../hooks/useAvailableModels';
import { useChatSessionData } from '../../../hooks/useChatSessionData';
import type { BuildAndChatPanelProps } from '../buildtypes';
import { filterSystemPrompt } from '../utils';
import { useCanvasStore, useUIStore } from '@/stores';

export function BuildAndChatPanel({
  onBlockSelect,
  workflowId,
  onWorkflowGraphSync,
  functionBlocks,
  triggerOptions = [],
  isLoadingTriggers = false,
  triggerInfoMessage,
}: BuildAndChatPanelProps) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const buildChatPanelCollapsed = useUIStore((state) => state.buildChatPanelCollapsed);
  const setBuildChatPanelCollapsed = useUIStore((state) => state.setBuildChatPanelCollapsed);
  const proposalPreview = useUIStore((state) => state.proposalPreview);
  const setProposalPreview = useUIStore((state) => state.setProposalPreview);
  const { handleSend, handleNewSession, handleSelectSession } = useChatActions(workflowId, nodes, edges);
  const { handleAcceptProposal, handleRejectProposal } = useProposalActions(workflowId, onWorkflowGraphSync);
  const { tools, isLoadingTools } = useWorkflowTools();
  const { models, isLoadingModels } = useAvailableModels();
  const { sessions, sessionsQuery } = useChatSessionData(workflowId);
  return (
    <div className="flex flex-col h-full bg-card border-l w-full relative">
      {buildChatPanelCollapsed && (
        <div className="absolute inset-y-0 left-0 z-50 w-12 flex flex-col items-center justify-center bg-card border-r border-border pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBuildChatPanelCollapsed(false)}
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
            onClick={() => setBuildChatPanelCollapsed(!buildChatPanelCollapsed)}
            title={buildChatPanelCollapsed ? "Show Build & Chat panel" : "Hide Build & Chat panel"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${buildChatPanelCollapsed ? 'rotate-180' : ''}`} />
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
          <UnifiedBuildPanel
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
            sessionsStatus={{
              isPending: sessionsQuery.isPending,
              isError: sessionsQuery.isError,
              error: sessionsQuery.error,
              hasNextPage: sessionsQuery.hasNextPage,
              fetchNextPage: sessionsQuery.fetchNextPage,
              isFetchingNextPage: sessionsQuery.isFetchingNextPage,
            }}
            onSelectSession={(sessionId) => handleSelectSession(sessionId, sessions)}
            onAcceptProposal={(proposalId) => handleAcceptProposal(proposalId).then(() => setProposalPreview(null))}
            onRejectProposal={(proposalId) => handleRejectProposal(proposalId).then(() => setProposalPreview(null))}
            activePreviewProposalId={proposalPreview?.proposal.id ?? null}
          />
        </TabsContent>

        <TabsContent value="executions" className="flex-1 mt-0 overflow-hidden">
          <ExecutionsPanel workflowId={workflowId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

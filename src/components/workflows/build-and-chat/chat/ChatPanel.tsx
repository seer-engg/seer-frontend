import { useEffect, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

import type { ChatSession, ModelInfo } from '../types';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessagesList } from './MessagesList';
import type { SessionsStatus } from './types';
import { useChatStore } from '@/stores';

interface ChatPanelProps {
  workflowId: string | null;
  onSend: () => void;
  models: ModelInfo[];
  isLoadingModels: boolean;
  filterSystemPrompt: (content: string) => string;
  onNewSession: () => void;
  sessions: ChatSession[];
  sessionsStatus: SessionsStatus;
  onSelectSession: (sessionId: number) => void;
  onAcceptProposal: (proposalId: number) => void;
  onRejectProposal: (proposalId: number) => void;
  activePreviewProposalId?: number | null;
}

export function ChatPanel({
  workflowId,
  onSend,
  models,
  isLoadingModels,
  filterSystemPrompt,
  onNewSession,
  sessions,
  sessionsStatus,
  onSelectSession,
  onAcceptProposal,
  onRejectProposal,
  activePreviewProposalId,
}: ChatPanelProps) {
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCount = useChatStore((state) => state.messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  if (!workflowId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Save a workflow to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        onNewSession={onNewSession}
        sessionPopoverOpen={sessionPopoverOpen}
        onSessionPopoverOpenChange={setSessionPopoverOpen}
        sessions={sessions}
        sessionsStatus={sessionsStatus}
        onSelectSession={onSelectSession}
      />
      <ScrollArea className="flex-1 p-4">
        <MessagesList
          filterSystemPrompt={filterSystemPrompt}
          listEndRef={messagesEndRef}
          onAcceptProposal={onAcceptProposal}
          onRejectProposal={onRejectProposal}
          activePreviewProposalId={activePreviewProposalId}
        />
      </ScrollArea>
      <ChatInput
        onSend={onSend}
        models={models}
        isLoadingModels={isLoadingModels}
      />
    </div>
  );
}


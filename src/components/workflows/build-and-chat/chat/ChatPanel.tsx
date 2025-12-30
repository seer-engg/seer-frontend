import { useEffect, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

import type { ChatMessage, ChatSession, ModelInfo } from '../types';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessagesList } from './MessagesList';
import type { SessionsStatus } from './types';

interface ChatPanelProps {
  workflowId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  models: ModelInfo[];
  isLoadingModels: boolean;
  filterSystemPrompt: (content: string) => string;
  onNewSession: () => void;
  sessions: ChatSession[];
  sessionsStatus: SessionsStatus;
  currentSessionId: number | null;
  onSelectSession: (sessionId: number) => void;
  proposalActionLoading: number | null;
  onAcceptProposal: (proposalId: number) => void;
  onRejectProposal: (proposalId: number) => void;
}

export function ChatPanel({
  workflowId,
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  selectedModel,
  onModelChange,
  models,
  isLoadingModels,
  filterSystemPrompt,
  onNewSession,
  sessions,
  sessionsStatus,
  currentSessionId,
  onSelectSession,
  proposalActionLoading,
  onAcceptProposal,
  onRejectProposal,
}: ChatPanelProps) {
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        currentSessionId={currentSessionId}
        onSelectSession={onSelectSession}
      />
      <ScrollArea className="flex-1 p-4">
        <MessagesList
          messages={messages}
          filterSystemPrompt={filterSystemPrompt}
          isLoading={isLoading}
          listEndRef={messagesEndRef}
          proposalActionLoading={proposalActionLoading}
          onAcceptProposal={onAcceptProposal}
          onRejectProposal={onRejectProposal}
        />
      </ScrollArea>
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        isSending={isLoading}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        models={models}
        isLoadingModels={isLoadingModels}
      />
    </div>
  );
}


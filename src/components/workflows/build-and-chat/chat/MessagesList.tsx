import { useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { Bot, FileText } from 'lucide-react';

import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@/stores';

interface MessagesListProps {
  filterSystemPrompt: (content: string) => string;
  listEndRef: RefObject<HTMLDivElement>;
  onAcceptProposal: (proposalId: number) => void;
  onRejectProposal: (proposalId: number) => void;
  activePreviewProposalId?: number | null;
}

export function MessagesList({
  filterSystemPrompt,
  listEndRef,
  onAcceptProposal,
  onRejectProposal,
  activePreviewProposalId,
}: MessagesListProps) {
  // FIXED: Individual selectors instead of useShallow
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const proposalActionLoading = useChatStore((state) => state.proposalActionLoading);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());

  const noMessages = useMemo(() => messages.length === 0, [messages.length]);

  const toggleThinking = (index: number) => {
    setExpandedThinking((prev) => {
      const copy = new Set(prev);
      if (copy.has(index)) {
        copy.delete(index);
      } else {
        copy.add(index);
      }
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      {noMessages ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Start a conversation about your workflow</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const filteredContent = filterSystemPrompt(message.content);
          return (
            <MessageBubble
              key={index}
              message={message}
              filteredContent={filteredContent}
              isThinkingExpanded={expandedThinking.has(index)}
              onToggleThinking={() => toggleThinking(index)}
              onAcceptProposal={onAcceptProposal}
              onRejectProposal={onRejectProposal}
              proposalActionLoading={proposalActionLoading}
              isActivePreview={Boolean(
                activePreviewProposalId && message.proposal?.id === activePreviewProposalId,
              )}
            />
          );
        })
      )}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground mt-1">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 max-w-[85%]">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={listEndRef} />
    </div>
  );
}


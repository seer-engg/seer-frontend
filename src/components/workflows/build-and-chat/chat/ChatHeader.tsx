import { SessionPopover } from './SessionPopover';
import type { ChatSession } from '../types';
import type { SessionsStatus } from './types';
import { useChatStore } from '@/stores';

interface ChatHeaderProps {
  onNewSession: () => void;
  sessionPopoverOpen: boolean;
  onSessionPopoverOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  sessionsStatus: SessionsStatus;
  onSelectSession: (sessionId: number) => void;
}

export function ChatHeader({
  onNewSession,
  sessionPopoverOpen,
  onSessionPopoverOpenChange,
  sessions,
  sessionsStatus,
  onSelectSession,
}: ChatHeaderProps) {
  const currentSessionId = useChatStore((state) => state.currentSessionId);

  return (
    <div className="p-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Chat</h3>
        <SessionPopover
          open={sessionPopoverOpen}
          onOpenChange={onSessionPopoverOpenChange}
          sessions={sessions}
          isPending={sessionsStatus.isPending}
          isError={sessionsStatus.isError}
          error={sessionsStatus.error}
          hasNextPage={sessionsStatus.hasNextPage}
          fetchNextPage={sessionsStatus.fetchNextPage}
          isFetchingNextPage={sessionsStatus.isFetchingNextPage}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
        />
      </div>
    </div>
  );
}


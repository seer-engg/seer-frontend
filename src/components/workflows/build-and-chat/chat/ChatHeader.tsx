import { SessionPopover } from './SessionPopover';
import type { ChatSession } from '../types';
import type { SessionsStatus } from './types';

interface ChatHeaderProps {
  onNewSession: () => void;
  sessionPopoverOpen: boolean;
  onSessionPopoverOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  sessionsStatus: SessionsStatus;
  currentSessionId: number | null;
  onSelectSession: (sessionId: number) => void;
}

export function ChatHeader({
  onNewSession,
  sessionPopoverOpen,
  onSessionPopoverOpenChange,
  sessions,
  sessionsStatus,
  currentSessionId,
  onSelectSession,
}: ChatHeaderProps) {
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


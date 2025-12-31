import { useMemo } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  filteredContent: string;
  isThinkingExpanded: boolean;
  onToggleThinking: () => void;
  onAcceptProposal: (proposalId: number) => void;
  onRejectProposal: (proposalId: number) => void;
  proposalActionLoading: number | null;
  isActivePreview?: boolean;
}

export function MessageBubble({
  message,
  filteredContent,
  isThinkingExpanded,
  onToggleThinking,
  onAcceptProposal,
  onRejectProposal,
  proposalActionLoading,
  isActivePreview,
}: MessageBubbleProps) {
  const showContent = useMemo(() => {
    if (message.role === 'assistant') {
      return filteredContent || message.content;
    }
    return message.content;
  }, [filteredContent, message.content, message.role]);

  if (!showContent && message.role === 'assistant') {
    return null;
  }

  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground mt-1">
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 max-w-[85%]">
        <div
          className={`rounded-lg p-3 ${
            message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap text-left">{showContent}</p>
          {message.thinking && message.thinking.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <button
                onClick={onToggleThinking}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isThinkingExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span>Thinking ({message.thinking.length} steps)</span>
              </button>
              {isThinkingExpanded && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground bg-background/50 p-2 rounded text-left">
                  {message.thinking.map((step, idx) => (
                    <div key={idx} className="font-mono">
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {message.proposalError && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Proposal Validation Error</AlertTitle>
                <AlertDescription className="text-xs">{message.proposalError}</AlertDescription>
              </Alert>
            </div>
          )}
          {message.proposal && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">AI Proposal</p>
                  <p className="text-xs text-muted-foreground">{message.proposal.summary}</p>
                </div>
                <Badge
                  className={cn(
                    'capitalize',
                    message.proposal.status === 'pending' && 'bg-amber-100 text-amber-900',
                    message.proposal.status === 'accepted' && 'bg-emerald-100 text-emerald-900',
                    message.proposal.status === 'rejected' && 'bg-rose-100 text-rose-900',
                  )}
                >
                  {message.proposal.status}
                </Badge>
              </div>
              {isActivePreview && (
                <Alert className="bg-sky-100 text-sky-900 border-sky-200">
                  <AlertTitle className="text-xs font-semibold">Preview Active</AlertTitle>
                  <AlertDescription className="text-xs">
                    This proposal is currently rendered on the canvas. Accept or reject to continue editing.
                  </AlertDescription>
                </Alert>
              )}
              {message.proposal.status === 'pending' && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={proposalActionLoading === message.proposal.id || !!message.proposalError}
                    onClick={() => message.proposal && onAcceptProposal(message.proposal.id)}
                  >
                    <Check className="w-3 h-3 mr-2" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={proposalActionLoading === message.proposal.id || !!message.proposalError}
                    onClick={() => message.proposal && onRejectProposal(message.proposal.id)}
                  >
                    <X className="w-3 h-3 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


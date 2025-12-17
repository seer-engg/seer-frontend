import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Terminal, Loader2, StopCircle } from 'lucide-react';
import { type Message } from '@langchain/langgraph-sdk';
import { Button } from '@/components/ui/button';

interface AgentLogsProps {
  messages: Message[];
  progress: string[];
  isStreaming: boolean;
  error: string | null;
  onStop?: () => void;
}

export function AgentLogs({ messages, progress, isStreaming, error, onStop }: AgentLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, progress]);

  const getMessageContent = (message: Message): string => {
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((block) => {
          if (typeof block === 'string') return block;
          if (typeof block === 'object' && block !== null) {
            const b = block as Record<string, unknown>;
            if (b.type === 'text' && typeof b.text === 'string') return b.text;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return '';
  };

  const getMessageColorClass = (type: string) => {
    switch (type) {
      case 'human':
        return 'text-blue-400';
      case 'ai':
        return 'text-cyan-400';
      case 'tool':
        return 'text-purple-400';
      default:
        return 'text-gray-300';
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'human':
        return '→';
      case 'ai':
        return '←';
      case 'tool':
        return '🔧';
      default:
        return '$';
    }
  };

  const hasContent = messages.length > 0 || progress.length > 0;

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--terminal-bg))] rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-black/20">
        <Terminal className="w-4 h-4 text-[hsl(var(--terminal-text))]" />
        <span className="text-sm font-medium text-[hsl(var(--terminal-text))]">Agent Logs</span>
        
        {isStreaming && (
          <div className="flex items-center gap-2 ml-2">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-primary">Streaming...</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {isStreaming && onStop && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <StopCircle className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>
      </div>

      {/* Logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
      >
        {!hasContent && !error ? (
          <div className="flex items-center text-muted-foreground">
            <span className="text-[hsl(var(--terminal-text))]">$</span>
            <span className="ml-2">Waiting for input...</span>
            <span className="ml-1 w-2 h-4 bg-[hsl(var(--terminal-text))] terminal-cursor" />
          </div>
        ) : (
          <>
            {/* Progress updates */}
            {progress.map((p, index) => (
              <div
                key={`progress-${index}`}
                className="flex items-start gap-2 text-yellow-400 animate-fade-in"
              >
                <span className="text-[hsl(var(--terminal-text))] select-none shrink-0">⚡</span>
                <span className="flex-1 min-w-0 whitespace-pre-wrap break-words">{p}</span>
              </div>
            ))}

            {/* Messages */}
            {messages.map((message, index) => {
              const content = getMessageContent(message);
              if (!content) return null;
              
              return (
                <div
                  key={`${message.id || 'msg'}-${index}`}
                  className={cn(
                    'flex items-start gap-2 animate-fade-in',
                    getMessageColorClass(message.type)
                  )}
                >
                  <span className="text-[hsl(var(--terminal-text))] select-none shrink-0">
                    {getMessageIcon(message.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="whitespace-pre-wrap break-words">{content}</span>
                  </div>
                  {index === messages.length - 1 && isStreaming && (
                    <span className="w-2 h-4 bg-[hsl(var(--terminal-text))] terminal-cursor shrink-0" />
                  )}
                </div>
              );
            })}
            
            {error && (
              <div className="flex items-start gap-2 text-red-400 mt-2 p-2 bg-red-500/10 rounded">
                <span className="select-none">✗</span>
                <span>{error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { LogEntry } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';

interface TerminalLogsProps {
  logs: LogEntry[];
}

export function TerminalLogs({ logs }: TerminalLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--terminal-bg))] rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-black/20">
        <Terminal className="w-4 h-4 text-[hsl(var(--terminal-text))]" />
        <span className="text-sm font-medium text-[hsl(var(--terminal-text))]">Logs</span>
        <div className="flex gap-1.5 ml-auto">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      </div>

      {/* Logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1"
      >
        {logs.length === 0 ? (
          <div className="flex items-center text-muted-foreground">
            <span className="text-[hsl(var(--terminal-text))]">$</span>
            <span className="ml-2">Waiting for input...</span>
            <span className="ml-1 w-2 h-4 bg-[hsl(var(--terminal-text))] terminal-cursor" />
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              className={cn(
                'flex items-start gap-2 animate-fade-in',
                log.type === 'success' && 'text-green-400',
                log.type === 'error' && 'text-red-400',
                log.type === 'warning' && 'text-yellow-400',
                log.type === 'info' && 'text-gray-300'
              )}
            >
              <span className="text-[hsl(var(--terminal-text))] select-none">$</span>
              <span className="flex-1">{log.message}</span>
              {index === logs.length - 1 && (
                <span className="w-2 h-4 bg-[hsl(var(--terminal-text))] terminal-cursor" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

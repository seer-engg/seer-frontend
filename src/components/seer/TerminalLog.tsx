import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'thinking';
  content: string;
}

interface TerminalLogProps {
  logs: LogEntry[];
  className?: string;
}

export function TerminalLog({ logs, className }: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeStyles = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-bug';
      case 'thinking':
        return 'text-seer';
      default:
        return 'text-terminal-foreground';
    }
  };

  const getPrefix = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'thinking':
        return '◐';
      default:
        return '>';
    }
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        "bg-terminal rounded-lg p-4 font-mono text-xs overflow-y-auto scrollbar-thin",
        className
      )}
    >
      {logs.map((log, index) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn("flex gap-2", getTypeStyles(log.type))}
        >
          <span className="opacity-50 shrink-0">
            {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className={cn(
            "shrink-0",
            log.type === 'thinking' && "animate-spin"
          )}>
            {getPrefix(log.type)}
          </span>
          <span className={cn(
            log.type === 'thinking' && "animate-pulse"
          )}>
            {log.content}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

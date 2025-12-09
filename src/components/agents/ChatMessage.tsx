import { motion } from "framer-motion";
import { Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingPhase } from "@/lib/agents/langgraphClient";
import { ThinkingProcess } from "./thinking/ThinkingProcess";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

export function ChatMessage({
  message,
  thinkingPhases,
  agentIcon: AgentIcon,
}: {
  message: Message;
  thinkingPhases?: ThinkingPhase[];
  agentIcon: React.ComponentType<{ className?: string }>;
}) {
  const isUser = message.role === "user";
  const hasContent = message.content && message.content.trim().length > 0;
  const isStreaming = message.isStreaming && !hasContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-seer to-indigo-500"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <AgentIcon className="h-4 w-4 text-white" />
        )}
      </div>

      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        {/* Show thinking phases separately (only for assistant messages) */}
        {!isUser && thinkingPhases && thinkingPhases.length > 0 && (
          <ThinkingProcess phases={thinkingPhases} />
        )}

        {/* Show final answer separately (only if there's content and not just thinking) */}
        {!isUser && hasContent && (
          <div className="rounded-2xl px-4 py-3 bg-secondary text-foreground rounded-tl-sm">
            <div className="text-sm whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
          )}

        {/* Show "Thinking..." placeholder only if no content and no thinking phases yet */}
        {!isUser && isStreaming && (!thinkingPhases || thinkingPhases.length === 0) && (
          <div className="rounded-2xl px-4 py-3 bg-secondary text-foreground rounded-tl-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
            </div>
          )}

        {/* User messages */}
        {isUser && (
          <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-tr-sm">
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
        )}

        <span className="text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}


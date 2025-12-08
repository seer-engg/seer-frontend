import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Wrench,
  Search,
  Calculator,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useAgentStream, ThinkingStep } from "@/lib/agents/useAgentStream";
import { AgentConfig } from "@/lib/agents/types";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();
  if (name.includes("search")) return Search;
  if (name.includes("calc")) return Calculator;
  if (name.includes("file") || name.includes("doc")) return FileText;
  return Wrench;
};

function ThinkingProcess({
  steps,
  isActive,
}: {
  steps: ThinkingStep[];
  isActive: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (steps.length === 0) return null;
  
  // Separate thinking steps from tool steps
  const thinkingSteps = steps.filter(s => s.type === "thinking");
  const toolSteps = steps.filter(s => s.type !== "thinking");

  const completedSteps = steps.filter((s) => s.status === "complete").length;
  const totalSteps = steps.length;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors w-full text-left group">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isActive ? "bg-seer/20" : "bg-success/20"
              )}
            >
              {isActive ? (
                <Loader2 className="h-3 w-3 text-seer animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 text-success" />
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {isActive ? "Thinking..." : "Thought Process"}
            </span>
            <Badge variant="secondary" className="ml-auto mr-2 text-xs">
              {completedSteps}/{totalSteps} steps
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-border ml-3">
            <AnimatePresence>
              {steps.map((step, index) => {
                const ToolIcon = getToolIcon(step.toolName);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 py-2 px-3 rounded-md bg-background/50"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center mt-0.5",
                        step.status === "running" && "bg-seer/20",
                        step.status === "complete" && "bg-success/20",
                        step.status === "error" && "bg-destructive/20",
                        step.status === "pending" && "bg-muted"
                      )}
                    >
                      {step.status === "running" ? (
                        <Loader2 className="h-3 w-3 text-seer animate-spin" />
                      ) : step.status === "complete" ? (
                        <CheckCircle className="h-3 w-3 text-success" />
                      ) : (
                        <ToolIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-seer">
                          {step.type === "thinking" ? "💭 thinking" : step.toolName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {step.type === "thinking" 
                            ? "reasoning" 
                            : step.type === "tool_call" 
                            ? "called" 
                            : "returned"}
                        </span>
                      </div>
                      {(step.type === "tool_result" || step.type === "thinking") && (
                        <pre className="mt-1 text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded overflow-x-auto max-h-32">
                          {typeof step.data === "string"
                            ? step.data.slice(0, 500) + (step.data.length > 500 ? "..." : "")
                            : JSON.stringify(step.data, null, 2).slice(0, 500)}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function ChatMessage({
  message,
  thinkingSteps,
  agentIcon: AgentIcon,
}: {
  message: Message;
  thinkingSteps?: ThinkingStep[];
  agentIcon: React.ComponentType<{ className?: string }>;
}) {
  const isUser = message.role === "user";
  const isThinking = message.isStreaming && !message.content;

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
        {!isUser && thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingProcess steps={thinkingSteps} isActive={message.isStreaming || false} />
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary text-foreground rounded-tl-sm"
          )}
        >
          {isThinking ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

interface AgentChatProps {
  config: AgentConfig;
  onMessage?: (message: Message) => void;
  initialMessages?: Message[];
  placeholder?: string;
  emptyState?: React.ReactNode;
}

export function AgentChat({
  config,
  onMessage,
  initialMessages = [],
  placeholder = "Ask me anything...",
  emptyState,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { streamMessage, isLoading, thinkingSteps, clearThinkingSteps } = useAgentStream({
    url: config.url,
    initialState: config.initialState,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    clearThinkingSteps();

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const threadId = crypto.randomUUID();
      await streamMessage(
        userMessage.content,
        threadId,
        (content, isDone) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content, isStreaming: !isDone }
                : m
            )
          );
        },
        undefined,
        (error) => {
          console.error("Agent stream error:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: `Error: ${error}`, isStreaming: false }
                : m
            )
          );
        }
      );

      const finalMessage = messages.find((m) => m.id === assistantMessage.id);
      if (finalMessage) {
        onMessage?.(finalMessage);
      }
    } catch (error) {
      console.error("Error streaming from agent:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: "Sorry, I encountered an error. Please try again.", isStreaming: false }
            : m
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          emptyState || (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-seer/20 to-indigo-500/20 flex items-center justify-center mb-4">
                <config.icon className="h-8 w-8 text-seer" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{config.name}</h2>
              <p className="text-muted-foreground max-w-md">{config.description}</p>
            </div>
          )
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                thinkingSteps={
                  message.role === "assistant" && index === messages.length - 1
                    ? thinkingSteps
                    : undefined
                }
                agentIcon={config.icon}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[200px] pr-14 resize-none bg-secondary/50 border-2 focus:border-seer"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="absolute right-2 bottom-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}


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
  Zap,
  CheckCircle,
  Key,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useUsageGate } from "@/hooks/useUsageGate";
import { UsageGateModal } from "@/components/UsageGateModal";
import {
  streamAgent,
  extractContentFromState,
  extractThinkingSteps,
  flattenNodeUpdates,
  createThread,
  type ThinkingStep as LangGraphThinkingStep,
} from "@/lib/agents/langgraphClient";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  timestamp: Date;
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "running" | "complete" | "error";
}

interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
}

interface ThinkingStep {
  type: "tool_call" | "tool_result" | "thinking";
  toolName: string;
  data: unknown;
  status: "pending" | "running" | "complete" | "error";
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
  isActive 
}: { 
  steps: ThinkingStep[];
  isActive: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (steps.length === 0) return null;

  const completedSteps = steps.filter(s => s.status === "complete").length;
  const totalSteps = steps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors w-full text-left group">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center",
              isActive ? "bg-seer/20" : "bg-success/20"
            )}>
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
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center mt-0.5",
                      step.status === "running" && "bg-seer/20",
                      step.status === "complete" && "bg-success/20",
                      step.status === "error" && "bg-destructive/20",
                      step.status === "pending" && "bg-muted"
                    )}>
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
                          {step.type === "tool_call" ? "called" : step.type === "thinking" ? "scratchpad" : "returned"}
                        </span>
                      </div>
                      {(step.type === "tool_result" || step.type === "thinking") && step.data && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-x-auto">
                          {step.type === "thinking" ? (
                            <div className="whitespace-pre-wrap max-h-96 overflow-y-auto">
                              {typeof step.data === "string" 
                                ? step.data
                                : JSON.stringify(step.data, null, 2)
                              }
                            </div>
                          ) : (
                            <pre className="max-h-48 overflow-y-auto">
                          {typeof step.data === "string" 
                                ? step.data
                                : JSON.stringify(step.data, null, 2)
                          }
                        </pre>
                          )}
                        </div>
                      )}
                      {step.type === "tool_call" && step.data && typeof step.data === "object" && Object.keys(step.data).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-x-auto">
                          <pre className="max-h-24 overflow-y-auto">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </div>
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
  thinkingSteps 
}: { 
  message: Message;
  thinkingSteps?: ThinkingStep[];
}) {
  const isUser = message.role === "user";
  const isThinking = message.isStreaming && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-gradient-to-br from-seer to-indigo-500"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        {/* Thinking Process (for assistant messages) */}
        {!isUser && thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingProcess 
            steps={thinkingSteps} 
            isActive={message.isStreaming || false}
          />
        )}

        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-secondary text-foreground rounded-tl-sm"
        )}>
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

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

export default function LangGraphChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showGateModal, setShowGateModal] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { canQuery, hasApiKey, remainingFreeQueries, incrementQueryCount, isLoading: usageLoading } = useUsageGate();

  // Supervisor configuration
  const SUPERVISOR_URL = import.meta.env.PROD 
    ? "https://seer-production.up.railway.app" 
    : "http://localhost:8000";
  const SUPERVISOR_AGENT_ID = "supervisor";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingSteps]);

  // Extract submission logic into a reusable function
  const submitMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Check usage gate
    if (!canQuery) {
      setShowGateModal(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setThinkingSteps([]);

    // Create placeholder for assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Get or create thread ID
      let threadId = currentThreadId;
      if (!threadId) {
        // Ensure we create a thread on the backend first
        threadId = await createThread(SUPERVISOR_URL);
        setCurrentThreadId(threadId);
      }

      // Stream using LangGraph SDK with events mode for real-time content
      let currentContent = "";
      let hasReceivedContent = false;

      for await (const event of streamAgent(
        SUPERVISOR_URL,
        SUPERVISOR_AGENT_ID,
        userMessage.content,
        threadId,
        { todos: [], tool_call_counts: { _total: 0 } }
      )) {
        const eventData = event.data as Record<string, unknown> | null;
        
        // Handle events stream mode - extract content from on_chat_model_stream
        if (event.event === "events" && eventData) {
          const eventType = eventData.event as string;
          
          // Extract content from chat model stream events (real-time token streaming)
          if (eventType === "on_chat_model_stream") {
            const data = eventData.data as Record<string, unknown> | undefined;
            const chunk = data?.chunk as Record<string, unknown> | undefined;
            if (chunk && typeof chunk === "object" && "content" in chunk) {
              const contentChunk = chunk.content as string;
              if (contentChunk && typeof contentChunk === "string") {
                currentContent += contentChunk;
                hasReceivedContent = true;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessage.id 
                      ? { ...m, content: currentContent, isStreaming: true }
                      : m
                  )
                );
              }
            }
          }
          
          // Also check on_chain_end for final content if we haven't received streamed content
          if (eventType === "on_chain_end" && !hasReceivedContent) {
            const data = eventData.data as Record<string, unknown> | undefined;
            const output = data?.output as Record<string, unknown> | undefined;
            if (output && typeof output === "object" && "messages" in output) {
              // Try to extract content from messages
              const messages = output.messages as Array<Record<string, unknown>> | undefined;
              if (Array.isArray(messages) && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && "content" in lastMessage && typeof lastMessage.content === "string") {
                  currentContent = lastMessage.content;
                  hasReceivedContent = true;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: currentContent, isStreaming: true }
                        : m
                    )
                  );
                }
              }
            }
          }
        } else if (event.event === "end") {
          // Finalize streaming
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, content: currentContent || "No response generated", isStreaming: false }
                : m
            )
          );
          break;
        } else if (event.event === "error") {
          const errorData = event.data as { message?: string; error?: string };
          throw new Error(errorData.message || errorData.error || "Unknown error");
        }
      }

      // Ensure final content is set (in case end event wasn't received)
      if (currentContent) {
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: currentContent, isStreaming: false }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error streaming from LangGraph:", error);
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: `Error: ${error instanceof Error ? error.message : "Connection failed"}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      // Increment query count after successful query (only if no API key)
      if (!hasApiKey) {
        await incrementQueryCount();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const messageText = input.trim();
    setInput("");
    await submitMessage(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Orchestrator</h1>
            <p className="text-xs text-muted-foreground">LangGraph Agent • Ready</p>
          </div>
        </div>
        
        {/* Usage indicator */}
        {!usageLoading && (
          <div className="flex items-center gap-2">
            {hasApiKey ? (
              <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                <Key className="h-3 w-3 mr-1" />
                API Key Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                {remainingFreeQueries} free {remainingFreeQueries === 1 ? 'query' : 'queries'} left
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Usage Gate Modal */}
      <UsageGateModal open={showGateModal} onOpenChange={setShowGateModal} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-seer via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-seer/20"
                >
                  <Zap className="h-12 w-12 text-white" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </motion.div>
              </div>

              <div className="space-y-4">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold bg-gradient-to-r from-foreground via-seer to-indigo-500 bg-clip-text text-transparent"
                >
                  Connect Your Accounts
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-muted-foreground"
                >
                  Coming soon: Connect your Google, Asana, and Microsoft accounts
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground/80 max-w-md mx-auto"
                >
                  We're building seamless integrations to connect your favorite tools. For now, you're using sandboxed accounts to explore the platform.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
              >
                {[
                  { name: "Google", icon: "🔵", status: "Sandboxed" },
                  { name: "Asana", icon: "🟣", status: "Sandboxed" },
                  { name: "Microsoft", icon: "🔷", status: "Sandboxed" },
                ].map((account, index) => (
                  <motion.div
                    key={account.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="p-4 rounded-xl border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm"
                  >
                    <div className="text-2xl mb-2">{account.icon}</div>
                    <div className="font-semibold text-sm mb-1">{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.status}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Preloaded Questions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="mt-8 space-y-3"
              >
                <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {[
                    "Summarize my last 5 emails",
                    "Find all open PRs on my repo",
                    "Create a task in Asana",
                    "Search for recent news on AI"
                  ].map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      onClick={() => {
                        // Directly submit the suggestion without setting input
                        submitMessage(suggestion);
                      }}
                      className="text-left px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-seer/50 text-sm transition-all duration-200 hover:shadow-md"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
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
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="min-h-[60px] max-h-[200px] pr-14 resize-none bg-secondary/50 border-2 focus:border-seer"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}


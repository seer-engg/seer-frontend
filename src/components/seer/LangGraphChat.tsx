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
  Clock,
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

// LangServe endpoint - Railway production URL
const LANGSERVE_URL = "https://supervisor-production-afd7.up.railway.app";

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
  type: "tool_call" | "tool_result";
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
                          {step.toolName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {step.type === "tool_call" ? "called" : "returned"}
                        </span>
                      </div>
                      {step.type === "tool_result" && (
                        <pre className="mt-1 text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded overflow-x-auto max-h-24">
                          {typeof step.data === "string" 
                            ? step.data.slice(0, 200) + (step.data.length > 200 ? "..." : "")
                            : JSON.stringify(step.data, null, 2).slice(0, 200)
                          }
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { canQuery, hasApiKey, remainingFreeQueries, incrementQueryCount, isLoading: usageLoading } = useUsageGate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check usage gate
    if (!canQuery) {
      setShowGateModal(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
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
      await streamFromLangServe(
        userMessage.content,
        assistantMessage.id,
        (content, isDone) => {
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, content, isStreaming: !isDone }
                : m
            )
          );
        },
        (step) => {
          setThinkingSteps(prev => [...prev, step]);
        },
        (error) => {
          console.error("LangServe error:", error);
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, content: `Error: ${error}`, isStreaming: false }
                : m
            )
          );
        }
      );
    } catch (error) {
      console.error("Error streaming from LangServe:", error);
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: "Sorry, I encountered an error. Please try again.", isStreaming: false }
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
            <h1 className="text-lg font-semibold">Tool Orchestrator</h1>
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
                      onClick={() => setInput(suggestion)}
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

// Stream from LangServe endpoint
async function streamFromLangServe(
  input: string,
  messageId: string,
  onContent: (content: string, isDone: boolean) => void,
  onThinkingStep: (step: ThinkingStep) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${LANGSERVE_URL}/agent/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          // FIX 1: Use 'type: human' instead of 'role: user'
          messages: [
            { 
              type: "human", 
              content: input 
            }
          ],
          // FIX 2: Initialize required state fields
          // Your SupervisorState (agents/state.py) defines 'todos' as required
          todos: [], 
          tool_call_counts: { _total: 0 }
        },
        // Optional: Add configuration if needed
        config: {
          configurable: {
            thread_id: messageId // Use conversation ID as thread_id
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let currentContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || line.startsWith(":")) continue;

        // Log every line for debugging
        console.log("[LangServe SSE]", line);

        if (line.startsWith("event: ")) {
          // SSE event type - log it
          console.log("[LangServe Event Type]", line.slice(7));
          continue;
        }

        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);
            console.log("[LangServe Parsed]", data);
            
            // LangGraph sends node updates as { "node_name": { state } }
            // Check if this is a node update format
            const nodeNames = Object.keys(data).filter(key => 
              key !== "event" && 
              key !== "data" && 
              typeof data[key] === "object" && 
              data[key] !== null
            );
            
            if (nodeNames.length > 0) {
              // This is a LangGraph node update - extract content from each node
              for (const nodeName of nodeNames) {
                const nodeState = data[nodeName];
                const content = extractFinalContent(nodeState as Record<string, unknown>);
                if (content) {
                  currentContent = content;
                  onContent(currentContent, false);
                  console.log(`[LangGraph Node: ${nodeName}] Extracted content:`, content.substring(0, 100));
                }
              }
              continue; // Skip other pattern matching for node updates
            }

            // Handle error events from LangServe
            if (data.status_code || data.error) {
              console.error("[LangServe Error]", data);
              onError(data.message || data.error || "Server error");
              return;
            }

            // LangGraph streaming format - look for various patterns
            // Pattern 1: on_tool_start/on_tool_end events
            if (data.event === "on_tool_start") {
              onThinkingStep({
                type: "tool_call",
                toolName: data.name || data.data?.name || "tool",
                data: data.data?.input || data.input || {},
                status: "running",
                timestamp: new Date(),
              });
            } else if (data.event === "on_tool_end") {
              onThinkingStep({
                type: "tool_result",
                toolName: data.name || data.data?.name || "tool",
                data: data.data?.output || data.output || data,
                status: "complete",
                timestamp: new Date(),
              });
            } 
            // Pattern 2: on_chat_model_stream for token streaming
            else if (data.event === "on_chat_model_stream") {
              const chunk = data.data?.chunk?.content || data.data?.chunk?.text || "";
              if (chunk) {
                currentContent += chunk;
                onContent(currentContent, false);
              }
            }
            // Pattern 3: on_chain_stream / on_chain_end with output
            else if (data.event === "on_chain_stream" || data.event === "on_chain_end") {
              const output = data.data?.output || data.data?.chunk || data.output;
              if (output) {
                const content = extractFinalContent(output);
                if (content) {
                  currentContent = content;
                  onContent(currentContent, false);
                }
              }
            }
            // Pattern 3b: LangGraph state updates - check for messages in state
            else if (data.event === "on_chain_end" && data.data) {
              // LangGraph might send the final state directly
              const state = data.data.output || data.data;
              if (state && typeof state === 'object') {
                const content = extractFinalContent(state);
                if (content) {
                  currentContent = content;
                  onContent(currentContent, false);
                }
              }
            }
            // Pattern 4: Direct content in data
            else if (data.content !== undefined && typeof data.content === "string") {
              currentContent = data.content;
              onContent(currentContent, false);
            }
            // Pattern 5: Output wrapper
            else if (data.output) {
              const content = extractFinalContent(data);
              if (content) {
                currentContent = content;
                onContent(currentContent, false);
              }
            }
            // Pattern 6: Messages array directly
            else if (data.messages && Array.isArray(data.messages)) {
              const content = extractFinalContent(data);
              if (content) {
                currentContent = content;
                onContent(currentContent, false);
              }
            }
            // Pattern 7: LangGraph state format - check for supervisor node output
            else if (data.supervisor && data.supervisor.messages) {
              const content = extractFinalContent(data.supervisor);
              if (content) {
                currentContent = content;
                onContent(currentContent, false);
              }
            }
            // Pattern 8: Any object with messages property (nested)
            else if (typeof data === 'object' && data !== null) {
              // Try to find messages anywhere in the object
              const content = extractFinalContent(data);
              if (content && content !== currentContent) {
                currentContent = content;
                onContent(currentContent, false);
              }
            }
          } catch (e) {
            console.warn("[LangServe Parse Error]", e, "Raw:", jsonStr);
          }
        }
      }
    }

    // Mark as complete - log what we got
    console.log("[LangServe Complete] Final content length:", currentContent.length);
    console.log("[LangServe Complete] Final content preview:", currentContent.substring(0, 200));
    
    if (currentContent.trim()) {
      onContent(currentContent, true);
    } else {
      // Last attempt: check if we missed any content in the buffer
      console.warn("[LangServe] No content extracted. Check browser console for '[LangServe Parsed]' logs to debug.");
      onContent("No response content received. Check console for SSE data.", true);
    }
  } catch (error) {
    console.error("[LangServe Error]", error);
    onError(error instanceof Error ? error.message : "Connection failed");
  }
}

// Extract final content from various LangServe response formats
function extractFinalContent(data: Record<string, unknown>): string {
  if (typeof data.content === "string" && data.content.trim()) {
    return data.content;
  }
  
  if (data.messages && Array.isArray(data.messages)) {
    const lastAI = [...data.messages].reverse().find(
      (m: { type?: string; role?: string }) => m.type === "ai" || m.role === "assistant"
    );
    if (lastAI) {
      const content = (lastAI as { content?: unknown }).content;
      if (typeof content === "string" && content.trim()) {
        return content;
      }
      // Also check for nested content
      if (typeof content === "object" && content !== null) {
        const nestedContent = extractFinalContent(content as Record<string, unknown>);
        if (nestedContent) {
          return nestedContent;
        }
      }
    }
  }
  
  if (data.output) {
    if (typeof data.output === "string") {
      return data.output;
    }
    const output = data.output as Record<string, unknown>;
    if (typeof output.content === "string") {
      return output.content;
    }
    if (output.messages && Array.isArray(output.messages)) {
      const lastMsg = [...output.messages].reverse().find(
        (m: { type?: string; role?: string }) => m.type === "ai" || m.role === "assistant"
      );
      if (lastMsg && typeof (lastMsg as { content?: unknown }).content === "string") {
        return (lastMsg as { content: string }).content;
      }
    }
  }
  
  return "";
}

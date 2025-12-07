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
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Placeholder - replace with your LangGraph deployment URL
const LANGGRAPH_API_URL = "YOUR_LANGGRAPH_DEPLOYMENT_URL";
const LANGGRAPH_ASSISTANT_ID = "YOUR_ASSISTANT_ID";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      // TODO: Replace with actual LangGraph SDK streaming
      // This is a mock implementation showing the expected behavior
      await mockLangGraphStream(
        userMessage.content,
        (chunk) => {
          // Handle streamed content
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        (step) => {
          // Handle thinking steps
          setThinkingSteps(prev => [...prev, step]);
        }
      );

      // Mark streaming complete
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, isStreaming: false }
            : m
        )
      );
    } catch (error) {
      console.error("Error streaming from LangGraph:", error);
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessage.id 
            ? { ...m, content: "Sorry, I encountered an error. Please try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
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
            <h1 className="text-lg font-semibold">Rube</h1>
            <p className="text-xs text-muted-foreground">LangGraph Agent • Ready</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Streaming
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-seer/20 to-indigo-500/20 flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-seer" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Quick Tasks, Instant Results</h2>
            <p className="text-muted-foreground max-w-md">
              Ask me anything. I'll show you my thought process as I work through it.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-lg">
              {[
                "Summarize my last 5 emails",
                "Find all open PRs on my repo",
                "Create a task in Asana",
                "Search for recent news on AI"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-left px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
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

// Mock function to simulate LangGraph streaming behavior
async function mockLangGraphStream(
  input: string,
  onContent: (chunk: string) => void,
  onThinkingStep: (step: ThinkingStep) => void
): Promise<void> {
  // Simulate tool calls for demonstration
  const tools = [
    { name: "search_web", delay: 800 },
    { name: "fetch_documents", delay: 600 },
    { name: "analyze_content", delay: 1000 },
  ];

  for (const tool of tools) {
    // Tool call
    onThinkingStep({
      type: "tool_call",
      toolName: tool.name,
      data: { query: input.slice(0, 50) },
      status: "running",
      timestamp: new Date(),
    });

    await new Promise(r => setTimeout(r, tool.delay));

    // Tool result
    onThinkingStep({
      type: "tool_result",
      toolName: tool.name,
      data: { result: `Results from ${tool.name}...`, success: true },
      status: "complete",
      timestamp: new Date(),
    });
  }

  // Simulate streaming response
  const response = `Based on my analysis, here's what I found:\n\n1. I searched the web for relevant information about "${input.slice(0, 30)}..."\n2. I analyzed the available documents and extracted key insights.\n3. The content has been processed and synthesized.\n\nWould you like me to dive deeper into any specific aspect?`;
  
  for (const char of response) {
    onContent(char);
    await new Promise(r => setTimeout(r, 15));
  }
}

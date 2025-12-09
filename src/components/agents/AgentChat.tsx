import { useState, useRef, useEffect } from "react";
import { IntegrationSelector } from "@/components/seer/integrations/IntegrationSelector";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThinkingPhase } from "@/lib/agents/langgraphClient";
import { AgentConfig } from "@/lib/agents/types";
import { useUsageGate } from "@/hooks/useUsageGate";
import { UsageGateModal } from "@/components/UsageGateModal";
import { ChatMessage, Message } from "./ChatMessage";
import { useAgentStream } from "./hooks/useAgentStream";

interface AgentChatProps {
  config: AgentConfig;
  onMessage?: (message: Message) => void;
  initialMessages?: Message[];
  placeholder?: string;
  emptyState?: React.ReactNode;
  autoSubmitText?: string;
  enableUsageGate?: boolean;
  customHeader?: React.ReactNode;
}

export function AgentChat({
  config,
  onMessage,
  initialMessages = [],
  placeholder = "Ask me anything...",
  emptyState,
  autoSubmitText,
  enableUsageGate = false,
  customHeader,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinkingPhasesMap, setThinkingPhasesMap] = useState<Map<string, ThinkingPhase[]>>(new Map());
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Usage gate hook (only if enabled)
  const usageGate = enableUsageGate ? useUsageGate() : null;
  const canQuery = usageGate ? usageGate.canQuery : true;
  const hasApiKey = usageGate ? usageGate.hasApiKey : false;
  const incrementQueryCount = usageGate ? usageGate.incrementQueryCount : async () => {};
  const usageLoading = usageGate ? usageGate.isLoading : false;

  // Agent stream hook
  const { streamToAgent: streamToAgentHook, isLoading } = useAgentStream(
    config,
    currentThreadId,
    setCurrentThreadId
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingPhasesMap]);

  // Auto-submit if autoSubmitText is provided
  useEffect(() => {
    if (autoSubmitText && !hasAutoSubmitted && !isLoading) {
      setHasAutoSubmitted(true);
      handleAutoSubmit(autoSubmitText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitText, hasAutoSubmitted, isLoading]);

  // Auto-submit if initialMessages contains a user message without a response (fallback)
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === initialMessages.length && !autoSubmitText) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        const hasAssistantResponse = messages.some(m => m.role === "assistant");
        if (!hasAssistantResponse && !isLoading) {
          handleAutoSubmit(lastMessage.content);
        }
      }
    }
  }, [initialMessages, messages, isLoading, autoSubmitText]);

  const handleAutoSubmit = async (userContent: string) => {
    if (!userContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setThinkingPhasesMap(prev => {
      const newMap = new Map(prev);
      newMap.set(assistantMessage.id, []);
      return newMap;
    });

    await streamToAgent(userMessage.content, assistantMessage.id);
  };

  const streamToAgent = async (userContent: string, assistantMessageId: string) => {
    const onContentUpdate = (content: string) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content, isStreaming: true }
            : m
        )
      );
    };

    const onPhasesUpdate = (phases: ThinkingPhase[]) => {
      setThinkingPhasesMap(prev => {
        const newMap = new Map(prev);
        newMap.set(assistantMessageId, phases);
        return newMap;
      });
    };

    await streamToAgentHook(userContent, assistantMessageId, onContentUpdate, onPhasesUpdate);

    // Finalize message
    setMessages(prev =>
      prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, isStreaming: false }
          : m
      )
    );

    const finalMessage = messages.find((m) => m.id === assistantMessageId);
    if (finalMessage) {
      onMessage?.(finalMessage);
    }

    // Increment query count after successful query (only if usage gate enabled and no API key)
    if (enableUsageGate && !hasApiKey) {
      await incrementQueryCount();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check usage gate if enabled
    if (enableUsageGate && !canQuery) {
      setShowGateModal(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setThinkingPhasesMap(prev => {
      const newMap = new Map(prev);
      newMap.set(assistantMessage.id, []);
      return newMap;
    });

    await streamToAgent(userMessage.content, assistantMessage.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Custom Header */}
      {customHeader && customHeader}

      {/* Usage Gate Modal */}
      {enableUsageGate && <UsageGateModal open={showGateModal} onOpenChange={setShowGateModal} />}

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
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                thinkingPhases={
                  message.role === "assistant"
                    ? thinkingPhasesMap.get(message.id) || []
                    : undefined
                }
                agentIcon={config.icon}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-border space-y-2">
        {/* Integration Selector - Compact dropdown above input */}
        <div className="flex justify-end">
          <IntegrationSelector />
        </div>
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
        <p className="text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

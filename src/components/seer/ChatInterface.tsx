import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Eye, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInterface({ messages, onSend, isLoading, placeholder }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ChatMessage message={message} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ThinkingIndicator />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type your message..."}
            className="min-h-[52px] max-h-[200px] resize-none pr-12 bg-secondary/50"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  return (
    <div className={cn(
      "flex gap-3",
      !isAgent && !isSystem && "justify-end"
    )}>
      {(isAgent || isSystem) && (
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isSystem ? "bg-warning/20" : "bg-gradient-to-br from-seer to-indigo-500"
        )}>
          {isSystem ? (
            <Eye className="h-4 w-4 text-warning" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
      )}

      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isAgent || isSystem
          ? "bg-secondary/50 rounded-tl-sm"
          : "bg-seer text-white rounded-tr-sm"
      )}>
        {message.thinking ? (
          <ThinkingContent />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {!isAgent && !isSystem && (
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center shrink-0 animate-pulse-glow glow-seer">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Thinking</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-seer rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-seer rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-seer rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ThinkingContent() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="animate-typing">Processing...</span>
    </div>
  );
}

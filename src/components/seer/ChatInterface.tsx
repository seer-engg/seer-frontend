import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Eye, Bot, User, AlertTriangle, CheckCircle, Code, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

export function ChatInterface({ messages, onSend, isLoading, placeholder, readOnly }: ChatInterfaceProps) {
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
      {!readOnly && (
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
      )}
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  // Render embedded component if present
  if (message.component) {
    return (
      <div className="flex gap-3">
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
        <div className="flex-1 max-w-[85%]">
          {message.component}
        </div>
      </div>
    );
  }

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

// Embeddable Components for Chat Messages
export function VerificationCard({ 
  agentClaim, 
  verificationResult, 
  passed 
}: { 
  agentClaim: string; 
  verificationResult: string; 
  passed: boolean;
}) {
  return (
    <Card className={cn(
      "border-2",
      passed ? "border-success/30 bg-success/5" : "border-bug/30 bg-bug/5"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-bug" />
          )}
          <span className="font-medium text-sm">
            {passed ? "Verification Passed" : "Verification Failed"}
          </span>
          <Badge variant="secondary" className={cn(
            "ml-auto text-xs",
            passed ? "bg-success/20 text-success" : "bg-bug/20 text-bug"
          )}>
            {passed ? "MATCH" : "MISMATCH"}
          </Badge>
        </div>

        <div className="grid gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Agent Output</p>
            <p className="text-sm font-mono">{agentClaim}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            passed ? "bg-success/10 border-success/20" : "bg-bug/10 border-bug/20"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Seer Eval Agent</p>
            <p className={cn(
              "text-sm font-mono",
              passed ? "text-success" : "text-bug"
            )}>
              {verificationResult}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TraceCard({
  status,
  failedStep,
  summary,
  onGenerateFix
}: {
  status: "passed" | "failed";
  failedStep?: number;
  summary: string;
  onGenerateFix?: () => void;
}) {
  return (
    <Card className={cn(
      "border-2",
      status === "failed" ? "border-bug/30 bg-bug/5" : "border-success/30 bg-success/5"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "failed" ? (
              <AlertTriangle className="h-5 w-5 text-bug" />
            ) : (
              <CheckCircle className="h-5 w-5 text-success" />
            )}
            <span className="font-medium text-sm">
              {status === "failed" ? `Failed at Step ${failedStep}` : "All Steps Passed"}
            </span>
          </div>
          <Badge variant="secondary" className={cn(
            "text-xs",
            status === "failed" ? "bg-bug/20 text-bug" : "bg-success/20 text-success"
          )}>
            {status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{summary}</p>

        {status === "failed" && onGenerateFix && (
          <Button 
            size="sm" 
            className="w-full gap-2 bg-seer hover:bg-seer/90"
            onClick={onGenerateFix}
          >
            <Code className="h-4 w-4" />
            Generate Fix
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CodeDiffCard({
  fileName,
  oldCode,
  newCode,
  onMerge,
  onReject
}: {
  fileName: string;
  oldCode: string;
  newCode: string;
  onMerge?: () => void;
  onReject?: () => void;
}) {
  return (
    <Card className="border-2 border-seer/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-seer" />
          <span className="font-medium text-sm">{fileName}</span>
          <Badge variant="secondary" className="ml-auto text-xs bg-seer/20 text-seer">
            FIX AVAILABLE
          </Badge>
        </div>

        <div className="font-mono text-xs space-y-1 p-3 rounded-lg bg-terminal">
          <div className="flex items-start gap-2 text-bug">
            <span className="text-muted-foreground select-none">-</span>
            <span>{oldCode}</span>
          </div>
          <div className="flex items-start gap-2 text-success">
            <span className="text-muted-foreground select-none">+</span>
            <span>{newCode}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            onClick={onReject}
          >
            Reject
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-success hover:bg-success/90"
            onClick={onMerge}
          >
            Merge & Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

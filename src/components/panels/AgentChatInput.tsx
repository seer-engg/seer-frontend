import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function AgentChatInput({ onSubmit, disabled }: AgentChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit(message);
      setMessage('');
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Agent Definition</span>
      </div>

      {/* Input area */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          What do you expect from your agent?
        </p>
        
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what your agent should do..."
            disabled={disabled}
            className="w-full min-h-[120px] p-3 pr-12 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className="absolute bottom-3 right-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to submit, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

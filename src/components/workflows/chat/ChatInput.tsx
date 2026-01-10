import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

import type { ModelInfo } from '../buildtypes';
import { useChatStore } from '@/stores';

interface ChatInputProps {
  onSend: () => void;
  models: ModelInfo[];
  isLoadingModels: boolean;
}

export function ChatInput({
  onSend,
  models,
  isLoadingModels,
}: ChatInputProps) {
  // FIXED: Individual selectors instead of useShallow
  const input = useChatStore((state) => state.input);
  const isLoading = useChatStore((state) => state.isLoading);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setInput = useChatStore((state) => state.setInput);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(80, Math.min(scrollHeight, 300))}px`;
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 flex-shrink-0 flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your workflow..."
        disabled={isLoading}
        className="min-h-[80px] resize-none w-full bg-background dark:bg-muted overflow-hidden"
        style={{ maxHeight: '300px' }}
      />
      <div className="flex items-center justify-end gap-2">
        <Select
          value={selectedModel}
          onValueChange={setSelectedModel}
          disabled={isLoadingModels || isLoading}
        >
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue placeholder={isLoadingModels ? 'Loading...' : 'Select model'} />
          </SelectTrigger>
          <SelectContent>
            {models
              .filter((model) => model.available)
              .map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button onClick={onSend} disabled={isLoading || !input.trim()} size="icon" className="h-8 w-8">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}


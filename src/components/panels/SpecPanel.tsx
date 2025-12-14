import { useState } from 'react';
import { SpecItem } from '@/types/workflow';
import { Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SpecPanelProps {
  specs: SpecItem[];
  onFeedback: (feedback: string) => void;
}

export function SpecPanel({ specs, onFeedback }: SpecPanelProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim()) {
      onFeedback(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Current Spec</span>
      </div>

      {/* Specs list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {specs.map((spec, index) => (
          <div
            key={spec.id}
            className="p-3 rounded-lg bg-muted/50 border border-border animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <p className="font-medium text-sm text-foreground">{spec.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{spec.description}</p>
          </div>
        ))}
      </div>

      {/* Chat input */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Provide feedback on the spec</p>
        <div className="flex gap-2">
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Type your feedback..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button size="icon" onClick={handleSubmit}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

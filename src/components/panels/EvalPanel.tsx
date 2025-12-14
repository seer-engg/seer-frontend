import { EvalCase } from '@/types/workflow';
import { TestTube, ArrowRight } from 'lucide-react';

interface EvalPanelProps {
  evalCases: EvalCase[];
}

export function EvalPanel({ evalCases }: EvalPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <TestTube className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Evaluation Cases</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {evalCases.length} cases
        </span>
      </div>

      {/* Cases list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {evalCases.map((evalCase, index) => (
          <div
            key={evalCase.id}
            className="p-3 rounded-lg bg-muted/50 border border-border animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                IN
              </span>
              <p className="text-sm text-foreground flex-1">{evalCase.input}</p>
            </div>
            <div className="flex items-center gap-2 pl-6 text-muted-foreground">
              <ArrowRight className="w-3 h-3" />
            </div>
            <div className="flex items-start gap-2 mt-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">
                OUT
              </span>
              <p className="text-sm text-muted-foreground flex-1">{evalCase.expectedOutput}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

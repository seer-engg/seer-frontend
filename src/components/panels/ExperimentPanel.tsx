import { ExperimentResult } from '@/types/workflow';
import { FlaskConical, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperimentPanelProps {
  result: ExperimentResult | null;
}

export function ExperimentPanel({ result }: ExperimentPanelProps) {
  if (!result) return null;

  const phases = [
    { key: 'provision', label: 'Provision', data: result.provision },
    { key: 'invoke', label: 'Invoke Target', data: result.invoke },
    { key: 'assert', label: 'Assert', data: result.assert },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Experiment Results</span>
        {result.assert.status === 'complete' && (
          <span className={cn(
            'ml-auto text-xs px-2 py-0.5 rounded-full font-medium',
            result.assert.passed
              ? 'bg-green-500/10 text-green-600'
              : 'bg-red-500/10 text-red-600'
          )}>
            {result.assert.passed ? 'Passed' : 'Failed'}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {phases.map((phase) => (
          <div
            key={phase.key}
            className="rounded-lg border border-border overflow-hidden"
          >
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 border-b border-border',
              phase.data.status === 'complete' && 'bg-green-500/5',
              phase.data.status === 'processing' && 'bg-yellow-500/5'
            )}>
              {phase.data.status === 'processing' && (
                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              )}
              {phase.data.status === 'complete' && (
                <Check className="w-4 h-4 text-green-500" />
              )}
              {phase.data.status === 'idle' && (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">{phase.label}</span>
            </div>
            
            {phase.data.logs.length > 0 && (
              <div className="p-3 bg-muted/30 space-y-1">
                {phase.data.logs.map((log, i) => (
                  <p key={i} className="text-xs text-muted-foreground font-mono">
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

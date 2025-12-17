import { ExperimentResult, ExperimentRun } from '@/types/workflow';
import { FlaskConical, Check, Loader2, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperimentPanelProps {
  result: ExperimentResult | null;
  runs: ExperimentRun[];
}

export function ExperimentPanel({ result, runs }: ExperimentPanelProps) {
  const phases = result
    ? ([
        { key: 'provision', label: 'Provision', data: result.provision },
        { key: 'invoke', label: 'Invoke Target', data: result.invoke },
        { key: 'assert', label: 'Assert', data: result.assert },
      ] as const)
    : null;

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Experiment Results</span>
        {result?.assert.status === 'complete' && (
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
        {phases ? (
          phases.map((phase) => (
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
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No experiment execution has started yet. Kick off testing from the canvas to see live progress.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Evaluation Runs
            </span>
            <span className="text-xs text-muted-foreground">{runs.length} total</span>
          </div>

          {runs.length > 0 ? (
            runs.map((run) => {
              const durationMs = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
              const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
              return (
                <div
                  key={run.id}
                  className="p-4 rounded-lg border border-border bg-muted/40 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Case {run.datasetExample.example_id}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      run.passed ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    )}>
                      {run.passed ? 'Pass' : 'Fail'}
                    </span>
                    <span className="ml-auto text-xs font-mono text-muted-foreground">
                      Score {(run.analysis.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Input</p>
                      <p className="text-foreground">{run.datasetExample.input_message}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Expected Action</p>
                      <p className="text-muted-foreground">{run.datasetExample.expected_output.expected_action}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Actual Output</p>
                      <p className="text-foreground">{run.actualOutput}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Judge Notes</p>
                      <p className="text-foreground">{run.analysis.judgeReasoning}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="w-3 h-3" />
                    <span>
                      Started {new Date(run.startedAt).toLocaleTimeString()} · Duration {durationSeconds}s
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No experiment results yet. Once testing finishes, the detailed runs will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

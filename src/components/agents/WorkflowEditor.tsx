import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { TerminalLogs } from '@/components/panels/TerminalLogs';
import { SpecPanel } from '@/components/panels/SpecPanel';
import { EvalPanel } from '@/components/panels/EvalPanel';
import { ExperimentPanel } from '@/components/panels/ExperimentPanel';
import { AgentChatInput } from '@/components/panels/AgentChatInput';
import { useWorkflow } from '@/hooks/useWorkflow';
import { Button } from '@/components/ui/button';

interface WorkflowEditorProps {
  projectName: string;
  onBack: () => void;
}

export function WorkflowEditor({ projectName, onBack }: WorkflowEditorProps) {
  const {
    nodeStatuses,
    logs,
    specs,
    evalCases,
    experimentResult,
    currentStep,
    processAgentSpec,
    processEvals,
    processExperiment,
  } = useWorkflow();

  const handleContinue = useCallback((nodeId: string) => {
    if (nodeId === 'evals') {
      processEvals();
    } else if (nodeId === 'experiment') {
      processExperiment();
    }
  }, [processEvals, processExperiment]);

  const handleAgentSubmit = useCallback((message: string) => {
    processAgentSpec(message);
  }, [processAgentSpec]);

  const handleSpecFeedback = useCallback((feedback: string) => {
    console.log('Spec feedback:', feedback);
  }, []);

  const showAgentInput = nodeStatuses.agentSpec === 'idle';
  const showSpecPanel = specs.length > 0;
  const showEvalPanel = evalCases.length > 0;
  const showExperimentPanel = experimentResult !== null;

  return (
    <div className="flex h-screen bg-background">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold text-foreground">{projectName}</h1>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            nodeStatuses={nodeStatuses}
            currentStep={currentStep}
            experimentResult={experimentResult}
            onContinue={handleContinue}
          />
        </div>
      </div>

      {/* Right Sidebar Panels */}
      <aside className="w-96 border-l border-border bg-card flex flex-col">
        {/* Top Panel - Chat or Spec */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
          {showAgentInput && (
            <AgentChatInput
              onSubmit={handleAgentSubmit}
              disabled={nodeStatuses.agentSpec === 'processing'}
            />
          )}

          {showSpecPanel && (
            <div className="flex-1 min-h-0">
              <SpecPanel specs={specs} onFeedback={handleSpecFeedback} />
            </div>
          )}

          {showEvalPanel && (
            <div className="flex-1 min-h-0">
              <EvalPanel evalCases={evalCases} />
            </div>
          )}

          {showExperimentPanel && (
            <div className="flex-1 min-h-0">
              <ExperimentPanel result={experimentResult} />
            </div>
          )}
        </div>

        {/* Bottom Panel - Logs */}
        <div className="h-64 p-4 pt-0">
          <TerminalLogs logs={logs} />
        </div>
      </aside>
    </div>
  );
}

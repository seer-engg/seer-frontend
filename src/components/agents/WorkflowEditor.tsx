import { useCallback, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { AgentLogs } from '@/components/panels/AgentLogs';
import { SpecPanel } from '@/components/panels/SpecPanel';
import { EvalPanel } from '@/components/panels/EvalPanel';
import { ExperimentPanel } from '@/components/panels/ExperimentPanel';
import { AgentChatInput } from '@/components/panels/AgentChatInput';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useAgentStream } from '@/hooks/useAgentStream';
import { Button } from '@/components/ui/button';

interface WorkflowEditorProps {
  projectName: string;
  threadId: string | null;
  agentId?: number;
  onBack: () => void;
}

export function WorkflowEditor({ projectName, threadId, agentId, onBack }: WorkflowEditorProps) {
  const {
    nodeStatuses,
    specs,
    evalCases,
    experimentResult,
    currentStep,
    setNodeStatuses,
    setSpecs,
    processEvals,
    processExperiment,
  } = useWorkflow();

  const { messages, progress, isStreaming, error, submitSpec, stop } = useAgentStream(threadId);

  // Update node status based on streaming state
  useEffect(() => {
    if (isStreaming) {
      setNodeStatuses(prev => ({ ...prev, agentSpec: 'processing' }));
    }
  }, [isStreaming, setNodeStatuses]);

  // Check for completion - when we have AI messages and streaming stopped
  useEffect(() => {
    const hasAIResponse = messages.some(m => m.type === 'ai');
    
    if (hasAIResponse && !isStreaming) {
      setNodeStatuses(prev => ({ 
        ...prev, 
        agentSpec: 'complete',
        evals: 'idle'
      }));
      
      // Extract specs from stream if available (mock for now until backend sends structured data)
      setSpecs([
        { id: '1', title: 'Integration Points', description: 'Extracted from agent analysis' },
        { id: '2', title: 'Trigger Event', description: 'Based on your requirements' },
        { id: '3', title: 'Actions', description: 'Defined from agent specification' },
        { id: '4', title: 'Error Handling', description: 'Retry logic and fallbacks' },
      ]);
    }
  }, [messages, isStreaming, setNodeStatuses, setSpecs]);

  const handleContinue = useCallback((nodeId: string) => {
    if (nodeId === 'evals') {
      processEvals();
    } else if (nodeId === 'experiment') {
      processExperiment();
    }
  }, [processEvals, processExperiment]);

  const handleAgentSubmit = useCallback((message: string) => {
    submitSpec(message);
  }, [submitSpec]);

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
          {threadId && (
            <span className="text-xs text-muted-foreground ml-2">
              Thread: {threadId.slice(0, 8)}...
            </span>
          )}
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
              disabled={isStreaming}
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

        {/* Bottom Panel - Agent Logs */}
        <div className="h-72 p-4 pt-0">
          <AgentLogs
            messages={messages}
            progress={progress}
            isStreaming={isStreaming}
            error={error}
            onStop={stop}
          />
        </div>
      </aside>
    </div>
  );
}

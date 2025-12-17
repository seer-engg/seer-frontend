import { useCallback, useEffect, useRef, useState } from 'react';
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
import { agentsApi } from '@/lib/agents-api';
import type { SpecResponse, ExperimentRun } from '@/types/workflow';
import { datasetExampleToEvalCase } from '@/types/workflow';

interface WorkflowEditorProps {
  projectName: string;
  threadId: string | null;
  agentId?: number;
  onBack: () => void;
}

const hasSpecData = (spec: SpecResponse | null) => {
  if (!spec) return false;
  return Boolean(
    spec.langgraph_agent_id?.trim() ||
      spec.mcp_services?.length ||
      spec.functional_requirements?.length,
  );
};

const summarizeExperimentLogs = (runs: ExperimentRun[]): string[] => {
  if (!runs?.length) return [];
  return runs.map(run => {
    const score = (run.analysis.score * 100).toFixed(0);
    const status = run.passed ? 'PASS' : 'FAIL';
    return `Case ${run.datasetExample.example_id}: ${status} — score ${score}%`;
  });
};

export function WorkflowEditor({ projectName, threadId, agentId, onBack }: WorkflowEditorProps) {
  const {
    nodeStatuses,
    spec,
    evalCases,
    experimentResult,
    experimentRuns,
    currentStep,
    setNodeStatuses,
    setSpec,
    setEvalCases,
    setExperimentResult,
    setExperimentRuns,
  } = useWorkflow();

  const { messages, progress, isStreaming, error, submitSpec, submitStep, stop } = useAgentStream(threadId);
  const hasLoadedSpecsRef = useRef(false);
  const [specStatusMessage, setSpecStatusMessage] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const hasLoadedEvalCasesRef = useRef(false);
  const hasLoadedExperimentsRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const currentStreamingStepRef = useRef<'spec' | 'plan' | 'testing' | null>(null);
  
  // Track which node is selected for displaying the corresponding panel
  const [selectedNode, setSelectedNode] = useState<string | null>('agentSpec');

  // Initialize workflow state from existing data on mount
  useEffect(() => {
    if (!threadId || hasInitializedRef.current) return;
    
    const initializeWorkflowState = async () => {
      hasInitializedRef.current = true;
      
      // Try to fetch existing spec
      try {
        const specResponse = await agentsApi.getSpec(threadId);
        if (!hasSpecData(specResponse)) return;

        hasLoadedSpecsRef.current = true;
        setSpec(specResponse);
        setSpecStatusMessage(null);
        setNodeStatuses(prev => ({ 
          ...prev, 
          agentSpec: 'complete',
          evals: 'idle'
        }));
        
        // If spec exists, try to fetch existing dataset/eval cases
        try {
          const datasetExamples = await agentsApi.getDataset(threadId);
          const evalCasesData = datasetExamples.map(datasetExampleToEvalCase);
          
          if (evalCasesData.length > 0) {
            hasLoadedEvalCasesRef.current = true;
            setEvalCases(evalCasesData);
            setNodeStatuses(prev => ({ 
              ...prev, 
              agentSpec: 'complete',
              evals: 'complete',
              experiment: 'idle'
            }));
            setSelectedNode('evals');

            try {
              const experiments = await agentsApi.getExperiments(threadId);
              if (experiments.length > 0) {
                hasLoadedExperimentsRef.current = true;
                setExperimentRuns(experiments);
                setExperimentResult({
                  provision: { status: 'complete', logs: ['Restored previous run'] },
                  invoke: { status: 'complete', logs: ['Testing completed'] },
                  assert: {
                    status: 'complete',
                    logs: summarizeExperimentLogs(experiments),
                    passed: experiments.every(exp => exp.passed),
                  },
                });
                setNodeStatuses(prev => ({
                  ...prev,
                  experiment: 'complete',
                  codex: 'idle',
                }));
                setSelectedNode('experiment');
              }
            } catch {
              console.log('No existing experiments found for this thread yet');
            }
          }
        } catch {
          // Dataset doesn't exist yet - that's fine, evals step not completed
          console.log('No existing dataset found, evals step not yet completed');
        }
      } catch {
        // Spec doesn't exist yet - fresh workflow
        console.log('No existing spec found, starting fresh workflow');
      }
    };
    
    initializeWorkflowState();
  }, [threadId, setSpec, setEvalCases, setNodeStatuses, setExperimentResult, setExperimentRuns]);

  // Update node status based on streaming state
  useEffect(() => {
    if (isStreaming) {
      const step = currentStreamingStepRef.current;
      if (step === 'spec') {
        setNodeStatuses(prev => ({ ...prev, agentSpec: 'processing' }));
      } else if (step === 'plan') {
        setNodeStatuses(prev => ({ ...prev, evals: 'processing' }));
      } else if (step === 'testing') {
        setNodeStatuses(prev => ({ ...prev, experiment: 'processing' }));
      }
    }
  }, [isStreaming, setNodeStatuses]);

  // Check for completion - when we have AI messages and streaming stopped
  useEffect(() => {
    const hasAIResponse = messages.some(m => m.type === 'ai');
    const currentStep = currentStreamingStepRef.current;
    
    // Handle spec step completion
    if (hasAIResponse && !isStreaming && threadId && !hasLoadedSpecsRef.current && currentStep === 'spec') {
      setNodeStatuses(prev => ({ 
        ...prev, 
        agentSpec: 'complete',
        evals: 'idle'
      }));
      
      // Fetch specs from the API
      const fetchSpecs = async () => {
        try {
          hasLoadedSpecsRef.current = true; // Mark as loading to prevent duplicate calls
          const specResponse = await agentsApi.getSpec(threadId);
          if (hasSpecData(specResponse)) {
            setSpec(specResponse);
            setSpecStatusMessage(null);
          } else {
            setSpec(null);
            setSpecStatusMessage({
              type: 'info',
              message: 'No specification data available yet.',
            });
          }
        } catch (error) {
          console.error('Failed to fetch specs:', error);
          setSpec(null);
          setSpecStatusMessage({
            type: 'error',
            message: 'Failed to load specification. Please try again.',
          });
          hasLoadedSpecsRef.current = false; // Reset on error to allow retry
        }
      };
      
      fetchSpecs();
      currentStreamingStepRef.current = null;
    }
    
    // Handle plan step completion
    if (!isStreaming && currentStep === 'plan' && nodeStatuses.evals === 'processing' && !hasLoadedEvalCasesRef.current) {
      setNodeStatuses(prev => ({ 
        ...prev, 
        evals: 'complete',
        experiment: 'idle'
      }));
      
      // Fetch eval cases from the API
      const fetchEvalCases = async () => {
        if (!threadId) return;
        
        try {
          hasLoadedEvalCasesRef.current = true; // Mark as loading to prevent duplicate calls
          const datasetExamples = await agentsApi.getDataset(threadId);
          const evalCasesData = datasetExamples.map(datasetExampleToEvalCase);
          
          if (evalCasesData.length > 0) {
            setEvalCases(evalCasesData);
          }
        } catch (error) {
          console.error('Failed to fetch eval cases:', error);
          hasLoadedEvalCasesRef.current = false; // Reset on error to allow retry
        }
      };
      
      fetchEvalCases();
      currentStreamingStepRef.current = null;
    }

    // Handle testing step completion (experiments)
    if (
      !isStreaming &&
      currentStep === 'testing' &&
      nodeStatuses.experiment === 'processing' &&
      !hasLoadedExperimentsRef.current
    ) {
      const fetchExperiments = async () => {
        if (!threadId) return;

        try {
          hasLoadedExperimentsRef.current = true;
          const experiments = await agentsApi.getExperiments(threadId);
          setExperimentRuns(experiments);
          setExperimentResult({
            provision: { status: 'complete', logs: ['Sandbox prepared'] },
            invoke: { status: 'complete', logs: ['Testing completed'] },
            assert: {
              status: 'complete',
              logs: summarizeExperimentLogs(experiments),
              passed: experiments.every(exp => exp.passed),
            },
          });
          setNodeStatuses(prev => ({
            ...prev,
            experiment: 'complete',
            codex: 'idle',
          }));
          setSelectedNode('experiment');
        } catch (error) {
          console.error('Failed to fetch experiments:', error);
          hasLoadedExperimentsRef.current = false;
          setNodeStatuses(prev => ({ ...prev, experiment: 'idle' }));
        } finally {
          currentStreamingStepRef.current = null;
        }
      };

      fetchExperiments();
    }
  }, [
    messages,
    isStreaming,
    threadId,
    setNodeStatuses,
    setSpec,
    setEvalCases,
    nodeStatuses.evals,
    nodeStatuses.experiment,
    setExperimentResult,
    setExperimentRuns,
  ]);

  const handleContinue = useCallback((nodeId: string) => {
    if (nodeId === 'evals') {
      // Start the plan step by submitting step: "plan" to the agent stream
      currentStreamingStepRef.current = 'plan';
      setNodeStatuses(prev => ({ ...prev, evals: 'processing' }));
      setSelectedNode('evals');
      submitStep('plan');
    } else if (nodeId === 'experiment') {
      currentStreamingStepRef.current = 'testing';
      hasLoadedExperimentsRef.current = false;
      setSelectedNode('experiment');
      setNodeStatuses(prev => ({ ...prev, experiment: 'processing' }));
      setExperimentRuns([]);
      setExperimentResult({
        provision: { status: 'processing', logs: [] },
        invoke: { status: 'idle', logs: [] },
        assert: { status: 'idle', logs: [], passed: false },
      });
      submitStep('testing');
    }
  }, [submitStep, setNodeStatuses, setExperimentResult, setExperimentRuns]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const handleAgentSubmit = useCallback((message: string) => {
    currentStreamingStepRef.current = 'spec';
    submitSpec(message, 'alignment');
  }, [submitSpec]);

  const handleSpecFeedback = useCallback((feedback: string) => {
    console.log('Spec feedback:', feedback);
  }, []);

  const showAgentInput = nodeStatuses.agentSpec === 'idle' && selectedNode === 'agentSpec';
  const showSpecPanel = selectedNode === 'agentSpec' && (Boolean(spec) || Boolean(specStatusMessage));
  const showEvalPanel = selectedNode === 'evals' && evalCases.length > 0;
  const showExperimentPanel = selectedNode === 'experiment' && (experimentResult !== null || experimentRuns.length > 0);
  
  // Show a placeholder message when a node is selected but has no data yet
  const showEmptyState = !showAgentInput && !showSpecPanel && !showEvalPanel && !showExperimentPanel;

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
            selectedNode={selectedNode}
            onContinue={handleContinue}
            onNodeSelect={handleNodeSelect}
          />
        </div>
      </div>

      {/* Right Sidebar Panels */}
      <aside className="w-2/4 border-l border-border bg-card flex flex-col">
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
              <SpecPanel spec={spec} statusMessage={specStatusMessage} onFeedback={handleSpecFeedback} />
            </div>
          )}

          {showEvalPanel && (
            <div className="flex-1 min-h-0">
              <EvalPanel evalCases={evalCases} />
            </div>
          )}

          {showExperimentPanel && (
            <div className="flex-1 min-h-0">
              <ExperimentPanel result={experimentResult} runs={experimentRuns} />
            </div>
          )}

          {showEmptyState && selectedNode && (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground p-6">
                <p className="text-sm">
                  {selectedNode === 'agentSpec' && 'Processing agent specification...'}
                  {selectedNode === 'evals' && 'No evaluation cases yet. Continue from AgentSpec to generate evals.'}
                  {selectedNode === 'experiment' && 'No experiment results yet. Continue from Evals to run experiments.'}
                  {selectedNode === 'codex' && 'Codex generation coming soon.'}
                </p>
              </div>
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

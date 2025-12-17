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
import type { SpecResponse, SpecItem } from '@/types/workflow';
import { datasetExampleToEvalCase } from '@/types/workflow';

interface WorkflowEditorProps {
  projectName: string;
  threadId: string | null;
  agentId?: number;
  onBack: () => void;
}

// Helper function to convert SpecResponse to SpecItem array
const convertSpecToItems = (spec: SpecResponse): SpecItem[] => {
  const items: SpecItem[] = [];
  
  if (spec.langgraph_agent_id) {
    items.push({
      id: '1',
      title: 'Agent ID',
      description: spec.langgraph_agent_id,
    });
  }
  
  if (spec.mcp_services && spec.mcp_services.length > 0) {
    items.push({
      id: '2',
      title: 'MCP Services',
      description: spec.mcp_services.join(', '),
    });
  }
  
  if (spec.functional_requirements && spec.functional_requirements.length > 0) {
    // Create individual items for each functional requirement
    spec.functional_requirements.forEach((requirement, index) => {
      items.push({
        id: `3-${index}`,
        title: `Requirement ${index + 1}`,
        description: requirement,
      });
    });
  }
  
  return items;
};

export function WorkflowEditor({ projectName, threadId, agentId, onBack }: WorkflowEditorProps) {
  const {
    nodeStatuses,
    specs,
    evalCases,
    experimentResult,
    currentStep,
    setNodeStatuses,
    setSpecs,
    setEvalCases,
    processEvals,
    processExperiment,
  } = useWorkflow();

  const { messages, progress, isStreaming, error, submitSpec, submitStep, stop } = useAgentStream(threadId);
  const hasLoadedSpecsRef = useRef(false);
  const hasLoadedEvalCasesRef = useRef(false);
  const currentStreamingStepRef = useRef<'spec' | 'plan' | null>(null);
  
  // Track which node is selected for displaying the corresponding panel
  const [selectedNode, setSelectedNode] = useState<string | null>('agentSpec');

  // Update node status based on streaming state
  useEffect(() => {
    if (isStreaming) {
      const step = currentStreamingStepRef.current;
      if (step === 'spec') {
        setNodeStatuses(prev => ({ ...prev, agentSpec: 'processing' }));
      } else if (step === 'plan') {
        setNodeStatuses(prev => ({ ...prev, evals: 'processing' }));
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
          const specItems = convertSpecToItems(specResponse);
          
          if (specItems.length > 0) {
            setSpecs(specItems);
          } else {
            // Fallback to a message if no specs are available
            setSpecs([
              { id: '1', title: 'Specification', description: 'No specification data available yet' },
            ]);
          }
        } catch (error) {
          console.error('Failed to fetch specs:', error);
          // Fallback to error message
          setSpecs([
            { id: '1', title: 'Error', description: 'Failed to load specification. Please try again.' },
          ]);
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
  }, [messages, isStreaming, threadId, setNodeStatuses, setSpecs, setEvalCases, nodeStatuses.evals]);

  const handleContinue = useCallback((nodeId: string) => {
    if (nodeId === 'evals') {
      // Start the plan step by submitting step: "plan" to the agent stream
      currentStreamingStepRef.current = 'plan';
      setNodeStatuses(prev => ({ ...prev, evals: 'processing' }));
      setSelectedNode('evals');
      submitStep('plan');
    } else if (nodeId === 'experiment') {
      setSelectedNode('experiment');
      processExperiment();
    }
  }, [submitStep, setNodeStatuses, processExperiment]);

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
  const showSpecPanel = selectedNode === 'agentSpec' && specs.length > 0;
  const showEvalPanel = selectedNode === 'evals' && evalCases.length > 0;
  const showExperimentPanel = selectedNode === 'experiment' && experimentResult !== null;
  
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

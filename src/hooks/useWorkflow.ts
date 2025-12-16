import { useState, useCallback } from 'react';
import { NodeStatus, LogEntry, SpecItem, EvalCase, ExperimentResult } from '@/types/workflow';

export function useWorkflow() {
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({
    agentSpec: 'idle',
    evals: 'disabled',
    experiment: 'disabled',
    codex: 'disabled',
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [evalCases, setEvalCases] = useState<EvalCase[]>([]);
  const [experimentResult, setExperimentResult] = useState<ExperimentResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('agentSpec');

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      message,
      timestamp: new Date(),
      type,
    }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const processAgentSpec = useCallback(async (description: string) => {
    clearLogs();
    setNodeStatuses(prev => ({ ...prev, agentSpec: 'processing' }));
    
    const logMessages = [
      { msg: 'Initializing agent specification...', delay: 500 },
      { msg: 'Extracting services required...', delay: 800 },
      { msg: 'Found github and asana integrations', delay: 600 },
      { msg: `User wants: "${description.slice(0, 50)}..."`, delay: 700 },
      { msg: 'Analyzing workflow requirements...', delay: 900 },
      { msg: 'Sandbox environment prepared', delay: 600 },
      { msg: 'Generating specification document...', delay: 800 },
      { msg: 'Specification complete ✓', delay: 500 },
    ];

    for (const log of logMessages) {
      await new Promise(r => setTimeout(r, log.delay));
      addLog(log.msg, log.msg.includes('✓') ? 'success' : 'info');
    }

    setSpecs([
      { id: '1', title: 'Integration Points', description: 'GitHub PR webhooks, Asana API' },
      { id: '2', title: 'Trigger Event', description: 'PR merge detection' },
      { id: '3', title: 'Action', description: 'Update/close linked Asana tasks' },
      { id: '4', title: 'Error Handling', description: 'Retry logic with exponential backoff' },
    ]);

    setNodeStatuses(prev => ({ 
      ...prev, 
      agentSpec: 'complete',
      evals: 'idle'
    }));
    setCurrentStep('evals');
  }, [addLog, clearLogs]);

  const processEvals = useCallback(async () => {
    clearLogs();
    setNodeStatuses(prev => ({ ...prev, evals: 'processing' }));

    const logMessages = [
      { msg: 'Generating evaluation cases...', delay: 600 },
      { msg: 'Analyzing edge cases...', delay: 700 },
      { msg: 'Creating input/output pairs...', delay: 800 },
      { msg: 'Validating test coverage...', delay: 600 },
      { msg: 'Evaluation suite ready ✓', delay: 500 },
    ];

    for (const log of logMessages) {
      await new Promise(r => setTimeout(r, log.delay));
      addLog(log.msg, log.msg.includes('✓') ? 'success' : 'info');
    }

    setEvalCases([
      { id: '1', input: 'PR #123 merged to main', expectedOutput: 'Task ASANA-456 marked complete' },
      { id: '2', input: 'PR #124 merged (no linked task)', expectedOutput: 'No action taken, log warning' },
      { id: '3', input: 'PR #125 closed without merge', expectedOutput: 'No action taken' },
      { id: '4', input: 'Asana API unavailable', expectedOutput: 'Retry with backoff, alert after 3 failures' },
    ]);

    setNodeStatuses(prev => ({ 
      ...prev, 
      evals: 'complete',
      experiment: 'idle'
    }));
    setCurrentStep('experiment');
  }, [addLog, clearLogs]);

  const processExperiment = useCallback(async () => {
    clearLogs();
    setNodeStatuses(prev => ({ ...prev, experiment: 'processing' }));
    
    const result: ExperimentResult = {
      provision: { status: 'idle', logs: [] },
      invoke: { status: 'idle', logs: [] },
      assert: { status: 'idle', logs: [], passed: false },
    };

    // Provision phase
    result.provision.status = 'processing';
    setExperimentResult({ ...result });
    
    const provisionLogs = [
      'Setting up sandbox environment...',
      'Initializing mock GitHub webhook...',
      'Connecting to Asana sandbox...',
      'Provision complete ✓',
    ];
    
    for (const log of provisionLogs) {
      await new Promise(r => setTimeout(r, 600));
      addLog(`[Provision] ${log}`, log.includes('✓') ? 'success' : 'info');
      result.provision.logs.push(log);
    }
    result.provision.status = 'complete';

    // Invoke phase
    result.invoke.status = 'processing';
    setExperimentResult({ ...result });
    
    const invokeLogs = [
      'Triggering PR merge event...',
      'Agent received webhook...',
      'Processing payload...',
      'Calling Asana API...',
      'Invoke complete ✓',
    ];
    
    for (const log of invokeLogs) {
      await new Promise(r => setTimeout(r, 500));
      addLog(`[Invoke] ${log}`, log.includes('✓') ? 'success' : 'info');
      result.invoke.logs.push(log);
    }
    result.invoke.status = 'complete';

    // Assert phase
    result.assert.status = 'processing';
    setExperimentResult({ ...result });
    
    const assertLogs = [
      'Verifying task status...',
      'Checking API response...',
      'Validating state changes...',
      'All assertions passed ✓',
    ];
    
    for (const log of assertLogs) {
      await new Promise(r => setTimeout(r, 500));
      addLog(`[Assert] ${log}`, log.includes('✓') ? 'success' : 'info');
      result.assert.logs.push(log);
    }
    result.assert.status = 'complete';
    result.assert.passed = true;

    setExperimentResult(result);
    setNodeStatuses(prev => ({ 
      ...prev, 
      experiment: 'complete',
      codex: 'idle'
    }));
    setCurrentStep('codex');
  }, [addLog, clearLogs]);

  return {
    nodeStatuses,
    setNodeStatuses,
    logs,
    specs,
    setSpecs,
    evalCases,
    setEvalCases,
    experimentResult,
    setExperimentResult,
    currentStep,
    setCurrentStep,
    processAgentSpec,
    processEvals,
    processExperiment,
    addLog,
    clearLogs,
  };
}

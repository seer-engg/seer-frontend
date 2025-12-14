export type NodeStatus = 'idle' | 'processing' | 'complete' | 'disabled';

export interface WorkflowNode {
  id: string;
  type: 'agentSpec' | 'evals' | 'experiment' | 'codex';
  status: NodeStatus;
  data?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SpecItem {
  id: string;
  title: string;
  description: string;
}

export interface EvalCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface ExperimentResult {
  provision: { status: NodeStatus; logs: string[] };
  invoke: { status: NodeStatus; logs: string[] };
  assert: { status: NodeStatus; logs: string[]; passed: boolean };
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  status: 'draft' | 'active' | 'complete';
}

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

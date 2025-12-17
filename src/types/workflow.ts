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

export interface SpecResponse {
  langgraph_agent_id: string;
  mcp_services: string[] | null;
  functional_requirements: string[] | null;
}

export interface EvalCase {
  id: string;
  input: string;
  expectedOutput: string;
}

// Backend dataset example response types
export interface ServiceInstructions {
  service_name: string;
  instructions: string[];
}

export interface ExpectedOutput {
  create_test_data: ServiceInstructions[];
  assert_final_state: ServiceInstructions[];
  expected_action: string;
}

export interface DatasetExample {
  example_id: string;
  input_message: string;
  expected_output: ExpectedOutput;
  status: 'active' | 'retired';
}

// Helper to convert DatasetExample to EvalCase
export const datasetExampleToEvalCase = (example: DatasetExample): EvalCase => ({
  id: example.example_id,
  input: example.input_message,
  expectedOutput: example.expected_output.expected_action,
});

export interface FailureAnalysis {
  score: number;
  judgeReasoning: string;
}

export interface ExperimentRun {
  id: string;
  datasetExample: DatasetExample;
  actualOutput: string;
  passed: boolean;
  analysis: FailureAnalysis;
  startedAt: string;
  completedAt: string;
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
  htmlUrl?: string;
  defaultBranch?: string;
  owner?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

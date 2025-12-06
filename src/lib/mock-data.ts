// Mock data for Seer prototype

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  artifacts?: Artifact[];
  thinking?: boolean;
}

export interface Artifact {
  type: 'spec' | 'code-diff' | 'trace' | 'test-plan' | 'verification';
  title: string;
  content: any;
}

export interface TestScenario {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  expectation: string;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  installed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  reliabilityScore: number;
  status: 'active' | 'building' | 'failed';
  tools: string[];
  lastRun: Date;
  runs: TestRun[];
}

export interface TestRun {
  id: string;
  timestamp: Date;
  status: 'passed' | 'failed' | 'running';
  duration: string;
  scenariosPassed: number;
  totalScenarios: number;
}

export interface TraceInsight {
  status: 'passed' | 'failed';
  failedStep?: number;
  summary: string;
  rootCause?: string;
  suggestion?: string;
}

// Mock conversation for the interview flow
export const mockInterviewConversation: Message[] = [
  {
    id: '1',
    role: 'agent',
    content: "Welcome to Seer. I'm here to help you build a reliable agent. What are we building today? (e.g., 'A PR Reviewer', 'A Support Bot', 'A Data Pipeline')",
    timestamp: new Date(Date.now() - 300000),
  },
];

export const mockAgentSpec = {
  goal: "Sync GitHub PR status to Asana tasks automatically",
  tools: [
    { name: 'github_get_pr', icon: 'Github' },
    { name: 'github_post_comment', icon: 'MessageSquare' },
    { name: 'asana_get_task', icon: 'CheckSquare' },
    { name: 'asana_update_task', icon: 'RefreshCw' },
  ],
  testPlan: [
    {
      id: '1',
      name: 'PR with linked Asana task',
      status: 'pending' as const,
      expectation: 'Task status updates to "In Review"',
    },
    {
      id: '2',
      name: 'PR without linked task',
      status: 'pending' as const,
      expectation: 'Agent posts comment asking for Asana link',
    },
    {
      id: '3',
      name: 'PR merged successfully',
      status: 'pending' as const,
      expectation: 'Asana task moves to "Done"',
    },
    {
      id: '4',
      name: 'PR closed without merge',
      status: 'pending' as const,
      expectation: 'Asana task returns to "In Progress"',
    },
    {
      id: '5',
      name: 'Rate limit handling',
      status: 'pending' as const,
      expectation: 'Agent retries with exponential backoff',
    },
  ],
};

export const mockTools: Tool[] = [
  { id: '1', name: 'GitHub', icon: 'Github', category: 'Version Control', description: 'Access PRs, issues, repos', installed: true },
  { id: '2', name: 'Asana', icon: 'CheckSquare', category: 'Project Management', description: 'Manage tasks and projects', installed: true },
  { id: '3', name: 'Slack', icon: 'MessageCircle', category: 'Communication', description: 'Send messages and notifications', installed: false },
  { id: '4', name: 'Notion', icon: 'FileText', category: 'Documentation', description: 'Read and write docs', installed: false },
  { id: '5', name: 'Linear', icon: 'Layers', category: 'Project Management', description: 'Track issues and sprints', installed: false },
  { id: '6', name: 'Gmail', icon: 'Mail', category: 'Communication', description: 'Read and send emails', installed: false },
  { id: '7', name: 'Google Docs', icon: 'FileEdit', category: 'Documentation', description: 'Create and edit documents', installed: false },
  { id: '8', name: 'PDF Plumber', icon: 'FileText', category: 'Document Processing', description: 'Extract text from PDFs', installed: false },
  { id: '9', name: 'PyPDF', icon: 'File', category: 'Document Processing', description: 'Parse and manipulate PDFs', installed: false },
  { id: '10', name: 'Jira', icon: 'Clipboard', category: 'Project Management', description: 'Manage Jira issues', installed: false },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'GitHub PR Agent',
    description: 'Syncs GitHub PRs to Asana tasks',
    reliabilityScore: 78,
    status: 'active',
    tools: ['GitHub', 'Asana'],
    lastRun: new Date(Date.now() - 3600000),
    runs: [
      { id: '1', timestamp: new Date(Date.now() - 3600000), status: 'passed', duration: '2m 34s', scenariosPassed: 4, totalScenarios: 5 },
      { id: '2', timestamp: new Date(Date.now() - 7200000), status: 'failed', duration: '1m 12s', scenariosPassed: 2, totalScenarios: 5 },
      { id: '3', timestamp: new Date(Date.now() - 10800000), status: 'passed', duration: '2m 45s', scenariosPassed: 5, totalScenarios: 5 },
    ],
  },
  {
    id: '2',
    name: 'Support Bot',
    description: 'Auto-responds to customer inquiries',
    reliabilityScore: 92,
    status: 'active',
    tools: ['Slack', 'Notion'],
    lastRun: new Date(Date.now() - 1800000),
    runs: [
      { id: '1', timestamp: new Date(Date.now() - 1800000), status: 'passed', duration: '1m 45s', scenariosPassed: 8, totalScenarios: 8 },
    ],
  },
];

export const mockCodeDiff = {
  filename: 'agent/tools/asana.py',
  oldCode: `def update_task(self, id: str, status: str):
    """Update an Asana task status"""
    return self.client.tasks.update(
        task_id=id,  # Bug: wrong parameter name
        data={"completed": status == "done"}
    )`,
  newCode: `def update_task(self, id: str, status: str):
    """Update an Asana task status"""
    return self.client.tasks.update(
        task_gid=id,  # Fix: correct parameter name
        data={"completed": status == "done"}
    )`,
  changes: [
    { line: 4, type: 'remove' as const, content: '        task_id=id,  # Bug: wrong parameter name' },
    { line: 4, type: 'add' as const, content: '        task_gid=id,  # Fix: correct parameter name' },
  ],
};

export const mockVerification = {
  agentClaim: "I have successfully closed the ticket and updated the status to 'Done'.",
  seerResult: {
    verified: false,
    actualState: "Ticket #45 is still 'Open' in Asana",
    apiResponse: {
      task_gid: "45",
      name: "Fix login bug",
      completed: false,
      assignee_status: "inbox"
    }
  }
};

export const mockAsanaBoard = {
  columns: [
    { id: 'todo', name: 'To Do', tasks: [{ id: '1', name: 'Update docs' }] },
    { id: 'in-progress', name: 'In Progress', tasks: [{ id: '2', name: 'Fix login bug', highlighted: true }] },
    { id: 'review', name: 'In Review', tasks: [] },
    { id: 'done', name: 'Done', tasks: [{ id: '3', name: 'Setup CI' }] },
  ],
};

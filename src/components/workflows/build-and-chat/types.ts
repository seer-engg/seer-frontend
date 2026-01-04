import type { ReactNode } from 'react';
import { Node } from '@xyflow/react';

import { WorkflowEdge, WorkflowNodeData } from '../types';
import type { TriggerListOption } from './build/TriggerSection';
import type { WorkflowSpec } from '@/types/workflow-spec';

export interface Tool {
  name: string;
  description: string;
  toolkit?: string;
  slug?: string;
  provider?: string;
  integration_type?: string;
  output_schema?: Record<string, any> | null;
}

export interface BuiltInBlock {
  type: string;
  label: string;
  description: string;
  icon: ReactNode;
}

export interface UserSummary {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
}

export interface WorkflowGraphPayload {
  nodes?: Node<WorkflowNodeData & Record<string, unknown>>[];
  edges?: WorkflowEdge[];
}

export interface WorkflowProposal {
  id: number;
  workflow_id: string;
  session_id?: number | null;
  created_by: UserSummary;
  summary: string;
  status: 'pending' | 'accepted' | 'rejected';
  spec: WorkflowSpec;
  preview_graph?: Record<string, any> | null;
  applied_graph?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowProposalActionResponse {
  proposal: WorkflowProposal;
  workflow_graph?: WorkflowGraphPayload | null;
}

export interface WorkflowProposalPreview {
  proposal: WorkflowProposal;
  graph: WorkflowGraphPayload;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  proposal?: WorkflowProposal | null;
  proposalError?: string | null;
  thinking?: string[];
  timestamp: Date;
  model?: string;
  interruptRequired?: boolean;
  interruptData?: Record<string, any>;
}

export interface ChatSession {
  id: number;
  workflow_id: string;
  user_id?: string;
  thread_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  provider: 'openai' | 'anthropic';
  name: string;
  available: boolean;
}

export interface BuildAndChatPanelProps {
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  workflowId: string | null;
  nodes: Node<WorkflowNodeData & Record<string, unknown>>[];
  edges: WorkflowEdge[];
  onWorkflowGraphSync?: (graph?: WorkflowGraphPayload | null) => void;
  onProposalPreviewChange?: (preview: WorkflowProposalPreview | null) => void;
  activePreviewProposalId?: number | null;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  functionBlocks?: BuiltInBlock[];
  onRunClick?: () => void;
  isExecuting?: boolean;
  triggerOptions?: TriggerListOption[];
  isLoadingTriggers?: boolean;
}


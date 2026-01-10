import type { ReactNode } from 'react';
import { Node } from '@xyflow/react';

import { WorkflowEdge, WorkflowNodeData } from '../types';
import { DroppedBlockData } from '../types';
import type { TriggerListOption } from './build/TriggerSection';
import type { JsonObject, WorkflowSpec, WorkflowVersionSummary } from '@/types/workflow-spec';

export interface Tool {
  name: string;
  description: string;
  toolkit?: string;
  slug?: string;
  provider?: string;
  integration_type?: string;
  output_schema?: JsonObject | null;
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
  preview_graph?: JsonObject | null;
  applied_graph?: JsonObject | null;
  metadata?: JsonObject | null;
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

export interface WorkflowLifecycleStatus {
  draftRevision?: number;
  latestVersion?: WorkflowVersionSummary | null;
  publishedVersion?: WorkflowVersionSummary | null;
  lastTestedVersionId?: number | null;
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
  interruptData?: JsonObject;
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
  onBlockSelect?: (block: DroppedBlockData) => void;
  workflowId: string | null;
  onWorkflowGraphSync?: (graph?: WorkflowGraphPayload | null) => void;
  functionBlocks?: BuiltInBlock[];
  triggerOptions?: TriggerListOption[];
  isLoadingTriggers?: boolean;
  triggerInfoMessage?: string;
}

// Unified item types for the Build Panel
export type ItemType = 'block' | 'trigger' | 'action';

export interface BaseItem {
  id: string;
  type: ItemType;
  label: string;
  description?: string;
  icon: ReactNode;
  searchTerms: string;
}

export interface BlockItem extends BaseItem {
  type: 'block';
  blockType: string;
  builtInBlock: BuiltInBlock;
}

export interface TriggerItem extends BaseItem {
  type: 'trigger';
  triggerKey: string;
  status?: 'ready' | 'action-required';
  badge?: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  isPrimaryActionLoading?: boolean;
  isSecondaryActionLoading?: boolean;
}

export interface ActionItem extends BaseItem {
  type: 'action';
  tool: Tool;
  integrationType: string;
}

export type UnifiedItem = BlockItem | TriggerItem | ActionItem;


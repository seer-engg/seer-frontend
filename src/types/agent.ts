export type AgentSourceType = "github" | "template";

export type AgentStatus = "draft" | "active" | "complete" | "error";

export interface AgentRecord {
  id: number;
  name: string;
  status: AgentStatus;
  source_type: AgentSourceType;
  repo_full_name?: string | null;
  repo_description?: string | null;
  repo_private?: boolean | null;
  repo_default_branch?: string | null;
  repo_html_url?: string | null;
  connected_account_id?: string | null;
  repo_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AgentSummary {
  id: number;
  name: string;
  status: AgentStatus;
  sourceType: AgentSourceType;
  repoFullName?: string | null;
  repoDescription?: string | null;
  repoPrivate?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}



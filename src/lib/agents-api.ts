import { backendApiClient } from "@/lib/api-client";
import type { AgentRecord, AgentSummary } from "@/types/agent";

interface ListAgentsResponse {
  agents: AgentRecord[];
}

export interface ImportGithubAgentRequest {
  connectedAccountId: string;
  repoId: string;
  repoFullName: string;
  repoDescription?: string | null;
  repoPrivate?: boolean | null;
  repoDefaultBranch?: string | null;
  repoHtmlUrl?: string | null;
  name?: string;
}

const mapAgentRecord = (record: AgentRecord): AgentSummary => ({
  id: record.id,
  name: record.name,
  status: record.status,
  sourceType: record.source_type,
  repoFullName: record.repo_full_name ?? null,
  repoDescription: record.repo_description ?? null,
  repoPrivate: record.repo_private ?? null,
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
});

export const agentsApi = {
  async listAgents(): Promise<AgentSummary[]> {
    const response = await backendApiClient.request<ListAgentsResponse>("/api/agents");
    return (response.agents ?? []).map(mapAgentRecord);
  },

  async importFromGithub(payload: ImportGithubAgentRequest): Promise<AgentSummary> {
    const body = {
      connected_account_id: payload.connectedAccountId,
      repo_id: payload.repoId,
      repo_full_name: payload.repoFullName,
      repo_description: payload.repoDescription,
      repo_private: payload.repoPrivate,
      repo_default_branch: payload.repoDefaultBranch,
      repo_html_url: payload.repoHtmlUrl,
      name: payload.name,
      source_type: "github",
    };

    const record = await backendApiClient.request<AgentRecord>("/api/agents/import", {
      method: "POST",
      body,
    });
    return mapAgentRecord(record);
  },
};



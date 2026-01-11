import type { StateCreator } from 'zustand';

import { backendApiClient } from '@/lib/api-client';
import type { WorkflowGraphData } from '@/lib/workflow-graph';
import { graphToWorkflowSpec, workflowSpecToGraph } from '@/lib/workflow-graph';
import type {
  JsonValue,
  RunResponse,
  WorkflowDraftPatchRequest,
  WorkflowListResponse,
  WorkflowResponse,
  WorkflowSummary,
  WorkflowVersionListResponse,
  WorkflowVersionRestoreRequest,
} from '@/types/workflow-spec';

import { createStore } from './createStore';

export type WorkflowListItem = WorkflowSummary;

export interface WorkflowModel extends WorkflowResponse {
  graph: WorkflowGraphData;
}

interface WorkflowVersionState {
  response: WorkflowVersionListResponse | null;
  isLoading: boolean;
  error: string | null;
}

export interface WorkflowStore {
  workflows: WorkflowListItem[];
  isLoading: boolean;
  workflowsLoaded: boolean;
  error: string | null;
  currentWorkflowId: string | null;
  currentWorkflow: WorkflowModel | null;
  selectedNodeId: string | null;
  workflowVersions: Record<string, WorkflowVersionState | undefined>;
  isCreating: boolean;
  isUpdating: boolean;
  isSavingDraft: boolean;
  isPublishing: boolean;
  isDeleting: boolean;
  isRestoringVersion: boolean;
  isExecuting: boolean;
  // Phase 1: Consolidated workflow UI state (previously in Workflows.tsx local state)
  selectedWorkflowId: string | null;
  workflowName: string;
  workflowInputData: Record<string, unknown>;
  isLoadingWorkflow: boolean;
  loadWorkflows: () => Promise<WorkflowListItem[]>;
  getWorkflow: (workflowId: string) => Promise<WorkflowModel>;
  loadWorkflow: (workflowId: string) => Promise<WorkflowModel>;
  setCurrentWorkflowId: (workflowId: string | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  // Phase 1: Setter actions for consolidated state
  setSelectedWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowInputData: (data: Record<string, unknown>) => void;
  clearWorkflowInputData: () => void;
  setIsLoadingWorkflow: (isLoading: boolean) => void;
  createWorkflow: (
    name: string,
    description: string | undefined,
    graph: WorkflowGraphData,
  ) => Promise<WorkflowModel>;
  updateWorkflowMetadata: (workflowId: string, updates: { name?: string; description?: string; tags?: string[] }) => Promise<WorkflowModel>;
  saveWorkflowDraft: (
    workflowId: string,
    params: { graph: WorkflowGraphData; baseRevision: number },
  ) => Promise<WorkflowModel>;
  publishWorkflow: (workflowId: string) => Promise<WorkflowModel>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  restoreWorkflowVersion: (
    workflowId: string,
    params: { versionId: number; baseRevision?: number },
  ) => Promise<WorkflowModel>;
  executeWorkflow: (
    workflowId: string,
    inputs?: Record<string, JsonValue>,
    config?: Record<string, JsonValue>,
  ) => Promise<RunResponse>;
  exportWorkflow: (workflowId: string) => Promise<void>;
  importWorkflow: (file: File, options: { name?: string; importTriggers: boolean }) => Promise<WorkflowModel>;
  loadWorkflowVersions: (workflowId: string) => Promise<WorkflowVersionListResponse>;
  invalidateWorkflowVersions: (workflowId: string) => void;
}

const initialVersionState: WorkflowVersionState = {
  response: null,
  isLoading: false,
  error: null,
};

const toWorkflowModel = (response: WorkflowResponse): WorkflowModel => ({
  ...response,
  graph: workflowSpecToGraph(response.spec),
});

const toListItem = (workflow: WorkflowModel): WorkflowListItem => ({
  workflow_id: workflow.workflow_id,
  name: workflow.name,
  description: workflow.description,
  draft_revision: workflow.draft_revision,
  created_at: workflow.created_at,
  updated_at: workflow.updated_at,
});

const updateWorkflowList = (workflows: WorkflowListItem[], updated: WorkflowModel) => {
  const idx = workflows.findIndex((workflow) => workflow.workflow_id === updated.workflow_id);
  if (idx === -1) {
    return [toListItem(updated), ...workflows];
  }
  const next = [...workflows];
  next[idx] = toListItem(updated);
  return next;
};

const removeWorkflowFromList = (workflows: WorkflowListItem[], workflowId: string) =>
  workflows.filter((workflow) => workflow.workflow_id !== workflowId);

interface BackendClientWithMeta {
  getBaseUrl?: () => string;
  baseUrl?: string;
  getToken?: () => Promise<string | null>;
}

const loadWorkflowsImpl = async (set: (partial: Partial<WorkflowStore>) => void) => {
  set({ isLoading: true, error: null });
  try {
    const response = await backendApiClient.request<WorkflowListResponse>('/api/v1/workflows', {
      method: 'GET',
    });
    set({ workflows: response.items, isLoading: false, workflowsLoaded: true });
    return response.items;
  } catch (error) {
    set({ isLoading: false, workflowsLoaded: true, error: error instanceof Error ? error.message : 'Failed to load workflows' });
    throw error;
  }
};

const getWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  workflowId: string,
) => {
  set({ error: null });
  try {
    const response = await backendApiClient.request<WorkflowResponse>(`/api/v1/workflows/${workflowId}`, {
      method: 'GET',
    });
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: updateWorkflowList(state.workflows, workflow),
      currentWorkflow: workflow,
      currentWorkflowId: workflowId,
    }));
    return workflow;
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to load workflow' });
    throw error;
  }
};

const createWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  name: string,
  description: string | undefined,
  graph: WorkflowGraphData,
) => {
  set({ isCreating: true, error: null });
  try {
    const spec = graphToWorkflowSpec(graph);
    const response = await backendApiClient.request<WorkflowResponse>('/api/v1/workflows', {
      method: 'POST',
      body: { name, description, spec },
    });
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: [toListItem(workflow), ...state.workflows],
      isCreating: false,
    }));
    return workflow;
  } catch (error) {
    set({ isCreating: false, error: error instanceof Error ? error.message : 'Failed to create workflow' });
    throw error;
  }
};

const updateWorkflowMetadataImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  workflowId: string,
  updates: { name?: string; description?: string; tags?: string[] },
) => {
  set({ isUpdating: true, error: null });
  try {
    const response = await backendApiClient.request<WorkflowResponse>(`/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      body: updates,
    });
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: updateWorkflowList(state.workflows, workflow),
      currentWorkflow: state.currentWorkflow?.workflow_id === workflowId ? workflow : state.currentWorkflow,
      isUpdating: false,
    }));
    return workflow;
  } catch (error) {
    set({ isUpdating: false, error: error instanceof Error ? error.message : 'Failed to update workflow' });
    throw error;
  }
};

const saveWorkflowDraftImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  get: () => WorkflowStore,
  workflowId: string,
  graph: WorkflowGraphData,
  baseRevision: number,
) => {
  set({ isSavingDraft: true, error: null });
  try {
    const existing = get().currentWorkflow;
    const spec = graphToWorkflowSpec(graph, existing?.spec);
    const body: WorkflowDraftPatchRequest = { base_revision: baseRevision, spec };
    const response = await backendApiClient.request<WorkflowResponse>(`/api/v1/workflows/${workflowId}/draft`, {
      method: 'PATCH',
      body: body as unknown as Record<string, unknown>,
    });
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: updateWorkflowList(state.workflows, workflow),
      currentWorkflow: state.currentWorkflow?.workflow_id === workflowId ? workflow : state.currentWorkflow,
      isSavingDraft: false,
    }));
    return workflow;
  } catch (error) {
    set({ isSavingDraft: false, error: error instanceof Error ? error.message : 'Failed to save draft' });
    throw error;
  }
};

const publishWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  get: () => WorkflowStore,
  workflowId: string,
) => {
  set({ isPublishing: true, error: null });
  try {
    const response = await backendApiClient.request<WorkflowResponse>(`/api/v1/workflows/${workflowId}/publish`, {
      method: 'POST',
    });
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: updateWorkflowList(state.workflows, workflow),
      currentWorkflow: state.currentWorkflow?.workflow_id === workflowId ? workflow : state.currentWorkflow,
      isPublishing: false,
    }));
    get().invalidateWorkflowVersions(workflowId);
    return workflow;
  } catch (error) {
    set({ isPublishing: false, error: error instanceof Error ? error.message : 'Failed to publish workflow' });
    throw error;
  }
};

const deleteWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  workflowId: string,
) => {
  set({ isDeleting: true, error: null });
  try {
    await backendApiClient.request(`/api/v1/workflows/${workflowId}`, { method: 'DELETE' });
    set((state) => ({
      workflows: removeWorkflowFromList(state.workflows, workflowId),
      isDeleting: false,
      currentWorkflow: state.currentWorkflow?.workflow_id === workflowId ? null : state.currentWorkflow,
    }));
  } catch (error) {
    set({ isDeleting: false, error: error instanceof Error ? error.message : 'Failed to delete workflow' });
    throw error;
  }
};

const restoreWorkflowVersionImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  get: () => WorkflowStore,
  workflowId: string,
  versionId: number,
  baseRevision?: number,
) => {
  set({ isRestoringVersion: true, error: null });
  try {
    const body: WorkflowVersionRestoreRequest = {};
    if (typeof baseRevision === 'number') {
      body.base_revision = baseRevision;
    }
    const response = await backendApiClient.request<WorkflowResponse>(
      `/api/v1/workflows/${workflowId}/versions/${versionId}/restore`,
      { method: 'POST', body: body as unknown as Record<string, unknown> },
    );
    const workflow = toWorkflowModel(response);
    set((state) => ({
      workflows: updateWorkflowList(state.workflows, workflow),
      currentWorkflow: state.currentWorkflow?.workflow_id === workflowId ? workflow : state.currentWorkflow,
      isRestoringVersion: false,
    }));
    get().invalidateWorkflowVersions(workflowId);
    return workflow;
  } catch (error) {
    set({ isRestoringVersion: false, error: error instanceof Error ? error.message : 'Failed to restore workflow version' });
    throw error;
  }
};

const executeWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  workflowId: string,
  inputs?: Record<string, JsonValue>,
  config?: Record<string, JsonValue>,
) => {
  set({ isExecuting: true, error: null });
  try {
    const payload = { inputs: inputs ?? {}, config: config ?? {} };
    const response = await backendApiClient.request<RunResponse>(`/api/v1/workflows/${workflowId}/runs`, {
      method: 'POST',
      body: payload,
    });
    set({ isExecuting: false });
    return response;
  } catch (error) {
    set({ isExecuting: false, error: error instanceof Error ? error.message : 'Failed to execute workflow' });
    throw error;
  }
};

const exportWorkflowImpl = async (workflowId: string) => {
  const clientMeta = backendApiClient as unknown as BackendClientWithMeta;
  const baseUrl = typeof clientMeta.getBaseUrl === 'function' ? clientMeta.getBaseUrl() : clientMeta.baseUrl ?? '';
  const url = `${baseUrl}/api/v1/workflows/${workflowId}/export`;
  const token = await clientMeta.getToken?.();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) throw new Error('Failed to export workflow');
  const contentDisposition = response.headers.get('Content-Disposition');
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || `workflow-${workflowId}.seer.json`;
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
};

const importWorkflowImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  file: File,
  options: { name?: string; importTriggers: boolean },
) => {
  set({ error: null });
  const text = await file.text();
  const importData = JSON.parse(text);
  const response = await backendApiClient.request<WorkflowResponse>('/api/v1/workflows/import', {
    method: 'POST',
    body: { import_data: importData, name: options.name, import_triggers: options.importTriggers },
  });
  const workflow = toWorkflowModel(response);
  set((state) => ({
    workflows: [toListItem(workflow), ...state.workflows],
  }));
  return workflow;
};

const loadWorkflowVersionsImpl = async (
  set: (partial: Partial<WorkflowStore>) => void,
  workflowId: string,
) => {
  set((state) => ({
    workflowVersions: {
      ...state.workflowVersions,
      [workflowId]: { ...(state.workflowVersions[workflowId] ?? initialVersionState), isLoading: true, error: null },
    },
  }));
  try {
    const response = await backendApiClient.request<WorkflowVersionListResponse>(
      `/api/v1/workflows/${workflowId}/versions`,
      { method: 'GET' },
    );
    set((state) => ({
      workflowVersions: { ...state.workflowVersions, [workflowId]: { response, isLoading: false, error: null } },
    }));
    return response;
  } catch (error) {
    set((state) => ({
      workflowVersions: {
        ...state.workflowVersions,
        [workflowId]: { response: null, isLoading: false, error: error instanceof Error ? error.message : 'Failed to load versions' },
      },
    }));
    throw error;
  }
};

const createWorkflowStore: StateCreator<WorkflowStore> = (set, get) => ({
  workflows: [],
  isLoading: false,
  workflowsLoaded: false,
  error: null,
  currentWorkflowId: null,
  currentWorkflow: null,
  selectedNodeId: null,
  workflowVersions: {},
  isCreating: false,
  isUpdating: false,
  isSavingDraft: false,
  isPublishing: false,
  isDeleting: false,
  isRestoringVersion: false,
  isExecuting: false,
  selectedWorkflowId: null,
  workflowName: 'My Workflow',
  workflowInputData: {},
  isLoadingWorkflow: false,
  async loadWorkflows() {
    return loadWorkflowsImpl(set);
  },
  async getWorkflow(workflowId) {
    return getWorkflowImpl(set, workflowId);
  },
  async loadWorkflow(workflowId) {
    const workflow = await get().getWorkflow(workflowId);
    set({ currentWorkflow: workflow, currentWorkflowId: workflowId });
    return workflow;
  },
  setCurrentWorkflowId(workflowId) {
    set({ currentWorkflowId: workflowId });
  },
  setSelectedNodeId(nodeId) {
    set({ selectedNodeId: nodeId });
  },
  setSelectedWorkflowId(id) {
    set({ selectedWorkflowId: id });
  },
  setWorkflowName(name) {
    set({ workflowName: name });
  },
  setWorkflowInputData(data) {
    set({ workflowInputData: data });
  },
  clearWorkflowInputData() {
    set({ workflowInputData: {} });
  },
  setIsLoadingWorkflow(isLoading) {
    set({ isLoadingWorkflow: isLoading });
  },
  async createWorkflow(name, description, graph) {
    return createWorkflowImpl(set, name, description, graph);
  },
  async updateWorkflowMetadata(workflowId, updates) {
    return updateWorkflowMetadataImpl(set, workflowId, updates);
  },
  async saveWorkflowDraft(workflowId, { graph, baseRevision }) {
    return saveWorkflowDraftImpl(set, get, workflowId, graph, baseRevision);
  },
  async publishWorkflow(workflowId) {
    return publishWorkflowImpl(set, get, workflowId);
  },
  async deleteWorkflow(workflowId) {
    return deleteWorkflowImpl(set, workflowId);
  },
  async restoreWorkflowVersion(workflowId, { versionId, baseRevision }) {
    return restoreWorkflowVersionImpl(set, get, workflowId, versionId, baseRevision);
  },
  async executeWorkflow(workflowId, inputs, config) {
    return executeWorkflowImpl(set, workflowId, inputs, config);
  },
  async exportWorkflow(workflowId) {
    return exportWorkflowImpl(workflowId);
  },
  async importWorkflow(file, options) {
    return importWorkflowImpl(set, file, options);
  },
  async loadWorkflowVersions(workflowId) {
    return loadWorkflowVersionsImpl(set, workflowId);
  },
  invalidateWorkflowVersions(workflowId) {
    set((state) => {
      const next = { ...state.workflowVersions };
      delete next[workflowId];
      return { workflowVersions: next };
    });
  },
});

export const useWorkflowStore = createStore(createWorkflowStore);


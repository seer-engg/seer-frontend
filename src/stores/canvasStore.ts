import { Node } from '@xyflow/react';
import type { StateCreator } from 'zustand';
import type { WorkflowEdge, WorkflowNodeData } from '@/components/workflows/types';
import { createStore } from './createStore';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type NodesUpdater =
  | Node<WorkflowNodeData>[]
  | ((prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[]);
type EdgesUpdater =
  | WorkflowEdge[]
  | ((prev: WorkflowEdge[]) => WorkflowEdge[]);

export interface CanvasStore {
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
  autosaveStatus: AutosaveStatus;
  setNodes: (updater: NodesUpdater) => void;
  setEdges: (updater: EdgesUpdater) => void;
  setGraph: (payload: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] }) => void;
  addNode: (node: Node<WorkflowNodeData>) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (edgeId: string) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setAutosaveStatus: (status: AutosaveStatus) => void;
  reset: () => void;
}

const initialState: Pick<
  CanvasStore,
  'nodes' | 'edges' | 'selectedNodeId' | 'editingNodeId' | 'autosaveStatus'
> = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  editingNodeId: null,
  autosaveStatus: 'idle',
};

const createCanvasStore: StateCreator<CanvasStore> = (set, get) => ({
  ...initialState,
  setNodes: (updater) =>
    set((state) => ({
      nodes:
        typeof updater === 'function'
          ? (updater as (prev: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])(state.nodes)
          : updater,
    })),
  setEdges: (updater) =>
    set((state) => ({
      edges:
        typeof updater === 'function'
          ? (updater as (prev: WorkflowEdge[]) => WorkflowEdge[])(state.edges)
          : updater,
    })),
  setGraph: ({ nodes, edges }) =>
    set((state) => ({
      nodes: nodes ?? state.nodes,
      edges: edges ?? state.edges,
    })),
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        const mergedData: WorkflowNodeData = {
          ...node.data,
          ...updates,
        };
        if (updates.config) {
          const mergedConfig = {
            ...(node.data?.config || {}),
            ...updates.config,
          };
          if ('fields' in updates.config) {
            mergedConfig.fields = updates.config.fields;
          }
          mergedData.config = mergedConfig;
        }
        return {
          ...node,
          data: mergedData,
        };
      }),
    })),
  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      editingNodeId: state.editingNodeId === nodeId ? null : state.editingNodeId,
    })),
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),
  deleteEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    })),
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
  setAutosaveStatus: (status) => set({ autosaveStatus: status }),
  reset: () => set(() => ({ ...initialState })),
});

export const useCanvasStore = createStore(createCanvasStore);



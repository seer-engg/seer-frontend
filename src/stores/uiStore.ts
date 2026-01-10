import { createJSONStorage, persist } from 'zustand/middleware';
import type { WorkflowProposalPreview } from '@/components/workflows/buildtypes';
import { createStore } from './createStore';

const storage = createJSONStorage(() => ({
  getItem: (key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  },
}));

export interface UIStore {
  isConfigDialogOpen: boolean;
  isImportDialogOpen: boolean;
  isKeymapOpen: boolean;
  isInputDialogOpen: boolean;
  buildChatPanelCollapsed: boolean;
  proposalPreview: WorkflowProposalPreview | null;
  // Phase 1: Workflow execution state (previously in useWorkflowLifecycle hook)
  lastRunVersionId: number | null;
  openConfigDialog: () => void;
  closeConfigDialog: () => void;
  setConfigDialogOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
  setKeymapOpen: (open: boolean) => void;
  setInputDialogOpen: (open: boolean) => void;
  toggleBuildChatPanel: () => void;
  setBuildChatPanelCollapsed: (collapsed: boolean) => void;
  setProposalPreview: (preview: WorkflowProposalPreview | null) => void;
  // Phase 1: Setter for execution state
  setLastRunVersionId: (id: number | null) => void;
  resetUIState: () => void;
}

const initialState: Pick<
  UIStore,
  | 'isConfigDialogOpen'
  | 'isImportDialogOpen'
  | 'isKeymapOpen'
  | 'isInputDialogOpen'
  | 'buildChatPanelCollapsed'
  | 'proposalPreview'
  | 'lastRunVersionId'
> = {
  isConfigDialogOpen: false,
  isImportDialogOpen: false,
  isKeymapOpen: false,
  isInputDialogOpen: false,
  buildChatPanelCollapsed: false,
  proposalPreview: null,
  lastRunVersionId: null,
};

export const useUIStore = createStore(
  persist<UIStore>(
    (set) => ({
      ...initialState,
      openConfigDialog: () => set({ isConfigDialogOpen: true }),
      closeConfigDialog: () => set({ isConfigDialogOpen: false }),
      setConfigDialogOpen: (open) => set({ isConfigDialogOpen: open }),
      setImportDialogOpen: (open) => set({ isImportDialogOpen: open }),
      setKeymapOpen: (open) => set({ isKeymapOpen: open }),
      setInputDialogOpen: (open) => set({ isInputDialogOpen: open }),
      toggleBuildChatPanel: () =>
        set((state) => ({
          buildChatPanelCollapsed: !state.buildChatPanelCollapsed,
        })),
      setBuildChatPanelCollapsed: (collapsed) => set({ buildChatPanelCollapsed: collapsed }),
      setProposalPreview: (preview) => set({ proposalPreview: preview }),
      // Phase 1: Implementation of execution state setter
      setLastRunVersionId: (id) => set({ lastRunVersionId: id }),
      resetUIState: () => set({ ...initialState }),
    }),
    {
      name: 'seer-ui-store',
      storage,
      partialize: (state) => ({
        buildChatPanelCollapsed: state.buildChatPanelCollapsed,
        isKeymapOpen: state.isKeymapOpen,
      }),
    },
  ),
);



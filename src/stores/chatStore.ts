import type { StateCreator } from 'zustand';

import type { ChatMessage } from '@/components/workflows/buildtypes';

import { createStore } from './createStore';

type MessagesUpdater = ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]);

export interface ChatStore {
  messages: ChatMessage[];
  input: string;
  selectedModel: string;
  isLoading: boolean;
  currentSessionId: number | null;
  currentThreadId: string | null;
  proposalActionLoading: number | null;
  setMessages: (updater: MessagesUpdater) => void;
  setInput: (value: string) => void;
  setSelectedModel: (model: string) => void;
  setIsLoading: (value: boolean) => void;
  setCurrentSessionId: (sessionId: number | null) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  setProposalActionLoading: (proposalId: number | null) => void;
  clearMessages: () => void;
  resetChatState: () => void;
}

const initialState: Omit<
  ChatStore,
  | 'setMessages'
  | 'setInput'
  | 'setSelectedModel'
  | 'setIsLoading'
  | 'setCurrentSessionId'
  | 'setCurrentThreadId'
  | 'setProposalActionLoading'
  | 'clearMessages'
  | 'resetChatState'
> = {
  messages: [],
  input: '',
  selectedModel: '',
  isLoading: false,
  currentSessionId: null,
  currentThreadId: null,
  proposalActionLoading: null,
};

const createChatStore: StateCreator<ChatStore> = (set) => ({
  ...initialState,
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === 'function'
          ? (updater as (prev: ChatMessage[]) => ChatMessage[])(state.messages)
          : updater,
    })),
  setInput: (value) => set({ input: value }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setIsLoading: (value) => set({ isLoading: value }),
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),
  setProposalActionLoading: (proposalId) => set({ proposalActionLoading: proposalId }),
  clearMessages: () => set({ messages: [] }),
  resetChatState: () => set(() => ({ ...initialState })),
});

export const useChatStore = createStore(createChatStore);



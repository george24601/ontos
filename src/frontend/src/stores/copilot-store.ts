import { create } from 'zustand';

export interface CopilotEntity {
  type: string;
  name: string;
  id: string;
}

export interface CopilotPageContext {
  pageName: string;
  pageUrl: string;
  selectedEntity?: CopilotEntity;
}

interface CopilotState {
  isOpen: boolean;
  pageContext: CopilotPageContext | null;
  actions: {
    togglePanel: () => void;
    openPanel: () => void;
    closePanel: () => void;
    setContext: (pageName: string, pageUrl: string, selectedEntity?: CopilotEntity) => void;
    clearContext: () => void;
  };
}

const VISITED_KEY = 'copilot-sidebar-visited';

export const useCopilotStore = create<CopilotState>()((set) => ({
  isOpen: localStorage.getItem(VISITED_KEY) !== 'true',
  pageContext: null,
  actions: {
    togglePanel: () => set((state) => {
      if (state.isOpen) localStorage.setItem(VISITED_KEY, 'true');
      return { isOpen: !state.isOpen };
    }),
    openPanel: () => set({ isOpen: true }),
    closePanel: () => {
      localStorage.setItem(VISITED_KEY, 'true');
      set({ isOpen: false });
    },
    setContext: (pageName, pageUrl, selectedEntity) =>
      set({ pageContext: { pageName, pageUrl, selectedEntity } }),
    clearContext: () => set({ pageContext: null }),
  },
}));

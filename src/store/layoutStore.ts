import { create } from "zustand";
import { ActiveSidebarView } from "../types";

interface LayoutState {
  sidebarWidth: number;
  activeSidebarView: ActiveSidebarView;
  agentWidth: number;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarView: (view: ActiveSidebarView) => void;
  toggleSidebar: () => void;
  setAgentWidth: (width: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarWidth: 260,
  activeSidebarView: "explorer",
  agentWidth: 380,

  setSidebarWidth: (width: number) => {
    set({ sidebarWidth: Math.max(180, Math.min(width, 700)) });
  },

  setActiveSidebarView: (view: ActiveSidebarView) => {
    set({ activeSidebarView: view });
  },

  toggleSidebar: () => {
    set((state) => ({
      activeSidebarView: state.activeSidebarView ? null : "explorer",
    }));
  },

  setAgentWidth: (width: number) => {
    set({ agentWidth: Math.max(280, Math.min(width, 900)) });
  },
}));

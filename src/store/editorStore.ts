import { create } from "zustand";
import { EditorTab } from "../types";
import { fsService } from "../services/tauri/fs";

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "javascript";
    case "rs":
      return "rust";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "py":
      return "python";
    case "toml":
      return "ini";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  openFile: (filePath: string) => Promise<void>;
  openDiffTab: (
    filePath: string,
    originalContent: string,
    proposedContent: string
  ) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  handleFileRenamed: (oldPath: string, newPath: string) => void;
  handleFileDeleted: (path: string) => void;
  closeActiveTab: () => void;
  closeAllTabs: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (filePath: string) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.filePath === filePath && !t.diffMode);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const content = await fsService.readFileContent(filePath);
      const title = filePath.split(/[/\\]/).pop() || filePath;
      const newTab: EditorTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filePath,
        title,
        content,
        isDirty: false,
        language: getLanguageFromPath(filePath),
      };

      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }));
    } catch (err) {
      console.error("Failed to open file:", filePath, err);
    }
  },

  openDiffTab: (
    filePath: string,
    originalContent: string,
    proposedContent: string
  ) => {
    const { tabs } = get();
    const title = `Diff: ${filePath.split(/[/\\]/).pop() || filePath}`;
    const diffTabId = `diff-${filePath}`;

    const existingIndex = tabs.findIndex((t) => t.id === diffTabId);
    const diffTab: EditorTab = {
      id: diffTabId,
      filePath,
      title,
      content: proposedContent,
      originalContent,
      isDirty: false,
      language: getLanguageFromPath(filePath),
      diffMode: true,
    };

    if (existingIndex >= 0) {
      const updated = [...tabs];
      updated[existingIndex] = diffTab;
      set({ tabs: updated, activeTabId: diffTabId });
    } else {
      set((state) => ({
        tabs: [...state.tabs, diffTab],
        activeTabId: diffTabId,
      }));
    }
  },

  closeTab: (id: string) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return state;

      const newTabs = state.tabs.filter((t) => t.id !== id);
      let nextActiveId = state.activeTabId;

      if (state.activeTabId === id) {
        if (newTabs.length > 0) {
          const nextIndex = Math.min(index, newTabs.length - 1);
          nextActiveId = newTabs[nextIndex].id;
        } else {
          nextActiveId = null;
        }
      }

      return { tabs: newTabs, activeTabId: nextActiveId };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateTabContent: (id: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, content, isDirty: true } : tab
      ),
    }));
  },

  saveActiveFile: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || tab.diffMode) return;

    try {
      await fsService.writeFileContent(tab.filePath, tab.content);
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === activeTabId ? { ...t, isDirty: false } : t
        ),
      }));
    } catch (err) {
      console.error("Failed to save file:", tab.filePath, err);
    }
  },

  handleFileRenamed: (oldPath: string, newPath: string) => {
    const newTitle = newPath.split(/[/\\]/).pop() || newPath;
    const newLang = getLanguageFromPath(newPath);
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.filePath === oldPath
          ? { ...t, filePath: newPath, title: newTitle, language: newLang }
          : t
      ),
    }));
  },

  handleFileDeleted: (path: string) => {
    set((state) => {
      const remainingTabs = state.tabs.filter((t) => t.filePath !== path);
      let nextActive = state.activeTabId;
      if (state.activeTabId && !remainingTabs.find((t) => t.id === state.activeTabId)) {
        nextActive = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null;
      }
      return { tabs: remainingTabs, activeTabId: nextActive };
    });
  },

  closeActiveTab: () => {
    const { activeTabId, closeTab } = get();
    if (activeTabId) {
      closeTab(activeTabId);
    }
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null });
  },
}));

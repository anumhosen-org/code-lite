import { create } from "zustand";
import { FileEntry } from "../types";
import { fsService } from "../services/tauri/fs";
import { useEditorStore } from "./editorStore";

interface WorkspaceState {
  workspacePath: string;
  fileTree: FileEntry | null;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  isLoading: boolean;
  setWorkspacePath: (path: string) => Promise<void>;
  openFolderDialog: () => Promise<void>;
  openFileDialog: () => Promise<void>;
  closeFolder: () => void;
  refreshTree: () => Promise<void>;
  toggleFolder: (path: string) => void;
  collapseAllFolders: () => void;
  selectPath: (path: string | null) => void;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  createItem: (fullPath: string, isDir: boolean) => Promise<void>;
  lazyExpandFolder: (path: string) => Promise<void>;
}

const getSavedWorkspacePath = (): string => {
  try {
    return (
      localStorage.getItem("code-lite:workspace-path") ||
      "d:\\Development\\TAURI\\Code Lite"
    );
  } catch {
    return "d:\\Development\\TAURI\\Code Lite";
  }
};

const initialPath = getSavedWorkspacePath();

function updateNodeChildren(
  node: FileEntry,
  targetPath: string,
  newChildren: FileEntry[]
): FileEntry {
  if (node.path === targetPath) {
    return { ...node, children: newChildren };
  }
  if (!node.children || node.children.length === 0) {
    return node;
  }
  return {
    ...node,
    children: node.children.map((child) =>
      updateNodeChildren(child, targetPath, newChildren)
    ),
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: initialPath,
  fileTree: null,
  selectedPath: null,
  expandedPaths: new Set([initialPath, `${initialPath}\\src`]),
  isLoading: false,

  setWorkspacePath: async (path: string) => {
    if (!path) {
      set({ workspacePath: "", fileTree: null, isLoading: false });
      return;
    }
    try {
      localStorage.setItem("code-lite:workspace-path", path);
    } catch {
      // ignore
    }

    set({
      workspacePath: path,
      isLoading: true,
      selectedPath: null,
      expandedPaths: new Set([path]),
    });

    try {
      const tree = await fsService.readDirTree(path, 4);
      set({ fileTree: tree, isLoading: false });
    } catch (err) {
      console.error("Failed to load workspace:", err);
      set({ isLoading: false });
    }
  },

  openFolderDialog: async () => {
    try {
      const selected = await fsService.pickFolder();
      if (selected) {
        await get().setWorkspacePath(selected);
      }
    } catch (err) {
      console.error("openFolderDialog error:", err);
    }
  },

  openFileDialog: async () => {
    try {
      const selected = await fsService.pickFile();
      if (selected) {
        useEditorStore.getState().openFile(selected);
      }
    } catch (err) {
      console.error("openFileDialog error:", err);
    }
  },

  closeFolder: () => {
    try {
      localStorage.removeItem("code-lite:workspace-path");
    } catch {
      // ignore
    }
    set({
      workspacePath: "",
      fileTree: null,
      selectedPath: null,
      expandedPaths: new Set(),
    });
    useEditorStore.getState().closeAllTabs();
  },

  refreshTree: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;
    try {
      const tree = await fsService.readDirTree(workspacePath, 4);
      set({ fileTree: tree });
    } catch (err) {
      console.error("Failed to refresh file tree:", err);
    }
  },

  toggleFolder: (path: string) => {
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedPaths: next };
    });
  },

  collapseAllFolders: () => {
    set({ expandedPaths: new Set() });
  },

  selectPath: (path: string | null) => {
    set({ selectedPath: path });
  },

  renameItem: async (oldPath: string, newPath: string) => {
    try {
      await fsService.renameEntry(oldPath, newPath);
      useEditorStore.getState().handleFileRenamed(oldPath, newPath);
      await get().refreshTree();
    } catch (err) {
      console.error("renameItem error:", err);
      throw err;
    }
  },

  deleteItem: async (path: string) => {
    try {
      await fsService.deleteEntry(path);
      useEditorStore.getState().handleFileDeleted(path);
      set((state) => {
        const next = new Set(state.expandedPaths);
        next.delete(path);
        return { expandedPaths: next };
      });
      await get().refreshTree();
    } catch (err) {
      console.error("deleteItem error:", err);
      throw err;
    }
  },

  createItem: async (fullPath: string, isDir: boolean) => {
    try {
      await fsService.createFileOrFolder(fullPath, isDir);
      await get().refreshTree();
      if (!isDir) {
        useEditorStore.getState().openFile(fullPath);
      }
    } catch (err) {
      console.error("createItem error:", err);
      throw err;
    }
  },

  lazyExpandFolder: async (path: string) => {
    const { fileTree, expandedPaths } = get();
    if (!fileTree) return;

    // Toggle expand state
    const nextExpanded = new Set(expandedPaths);
    if (nextExpanded.has(path)) {
      nextExpanded.delete(path);
      set({ expandedPaths: nextExpanded });
      return;
    }

    nextExpanded.add(path);
    set({ expandedPaths: nextExpanded });

    try {
      const children = await fsService.readDirChildren(path);
      const updatedTree = updateNodeChildren(fileTree, path, children);
      set({ fileTree: updatedTree });
    } catch (err) {
      console.error("lazyExpandFolder error:", err);
    }
  },
}));

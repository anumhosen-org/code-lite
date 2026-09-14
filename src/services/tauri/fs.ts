import { invoke } from "@tauri-apps/api/core";
import { FileEntry } from "../../types";

export const fsService = {
  async readDirTree(path: string, maxDepth?: number): Promise<FileEntry> {
    return await invoke<FileEntry>("read_dir_tree", { path, maxDepth });
  },

  async readFileContent(
    path: string,
    startLine?: number,
    endLine?: number
  ): Promise<string> {
    return await invoke<string>("read_file_content", {
      path,
      startLine,
      endLine,
    });
  },

  async writeFileContent(path: string, content: string): Promise<void> {
    await invoke("write_file_content", { path, content });
  },

  async createFileOrFolder(path: string, isDir: boolean): Promise<void> {
    await invoke("create_file_or_folder", { path, isDir });
  },

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    await invoke("rename_entry", { oldPath, newPath });
  },

  async deleteEntry(path: string): Promise<void> {
    await invoke("delete_entry", { path });
  },

  async readDirChildren(path: string): Promise<FileEntry[]> {
    return await invoke<FileEntry[]>("read_dir_children", { path });
  },

  async revealInExplorer(path: string): Promise<void> {
    await invoke("reveal_in_explorer", { path });
  },

  async pickFolder(): Promise<string | null> {
    return await invoke<string | null>("pick_folder");
  },

  async pickFile(): Promise<string | null> {
    return await invoke<string | null>("pick_file");
  },
};

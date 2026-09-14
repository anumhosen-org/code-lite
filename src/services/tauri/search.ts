import { invoke } from "@tauri-apps/api/core";
import { SearchMatch } from "../../types";

export const searchService = {
  async searchInWorkspace(
    workspacePath: string,
    query: string,
    isRegex: boolean = false,
    caseSensitive: boolean = false,
    fileFilter?: string,
    maxResults: number = 150
  ): Promise<SearchMatch[]> {
    return await invoke<SearchMatch[]>("search_in_workspace", {
      workspacePath,
      query,
      isRegex,
      caseSensitive,
      fileFilter: fileFilter || null,
      maxResults,
    });
  },
};

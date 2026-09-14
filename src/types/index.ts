export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  children?: FileEntry[];
}

export interface SearchMatch {
  file_path: string;
  relative_path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

export interface EditorTab {
  id: string;
  filePath: string;
  title: string;
  content: string;
  originalContent?: string; // Used for diff mode
  isDirty: boolean;
  language: string;
  diffMode?: boolean;
}

export type ActiveSidebarView = "explorer" | "search" | "models" | "engine" | "knowledge" | null;

export interface TerminalProfile {
  id: string;
  name: string;
  path: string;
  args: string[];
  icon: string;
}

export * from "./localAi";



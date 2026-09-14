import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { TerminalProfile } from "../../types";

export interface TerminalOutputPayload {
  id: string;
  data: string;
}

export const terminalService = {
  async getProfiles(): Promise<TerminalProfile[]> {
    return await invoke<TerminalProfile[]>("get_terminal_profiles");
  },

  async spawnTerminal(
    id: string,
    cwd?: string,
    cols: number = 80,
    rows: number = 24,
    shellPath?: string,
    shellArgs?: string[]
  ): Promise<void> {
    await invoke("spawn_terminal", {
      id,
      cwd,
      cols,
      rows,
      shellPath: shellPath || null,
      shellArgs: shellArgs || null,
    });
  },

  async writeTerminal(id: string, data: string): Promise<void> {
    await invoke("write_terminal", { id, data });
  },

  async resizeTerminal(id: string, cols: number, rows: number): Promise<void> {
    await invoke("resize_terminal", { id, cols, rows });
  },

  async killTerminal(id: string): Promise<void> {
    await invoke("kill_terminal", { id });
  },

  async onTerminalOutput(
    id: string,
    callback: (data: string) => void
  ): Promise<UnlistenFn> {
    return await listen<TerminalOutputPayload>(`terminal-output-${id}`, (event) => {
      callback(event.payload.data);
    });
  },
};

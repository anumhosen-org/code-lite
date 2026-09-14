import { create } from "zustand";
import { terminalService } from "../services/tauri/terminal";
import { TerminalProfile } from "../types";

export interface TerminalInstance {
  id: string;
  name: string;
  profileId?: string;
  shellPath?: string;
  shellArgs?: string[];
  icon?: string;
  isAgent?: boolean;
}

interface TerminalState {
  isOpen: boolean;
  terminals: TerminalInstance[];
  activeTerminalId: string;
  height: number;
  profiles: TerminalProfile[];
  defaultProfileId: string;
  toggleTerminal: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveTerminalId: (id: string) => void;
  loadProfiles: () => Promise<void>;
  addTerminal: (profile?: TerminalProfile, isAgent?: boolean) => string;
  switchTerminalProfile: (id: string, profile: TerminalProfile) => Promise<void>;
  closeTerminal: (id: string) => void;
  setDefaultProfileId: (id: string) => void;
  setHeight: (height: number) => void;
}

const getSavedDefaultProfile = (): string => {
  try {
    return localStorage.getItem("code-lite:default-profile") || "powershell";
  } catch {
    return "powershell";
  }
};

export const useTerminalStore = create<TerminalState>((set, get) => ({
  isOpen: false,
  terminals: [
    {
      id: "term-user-1",
      name: "PowerShell",
      profileId: "powershell",
      icon: "powershell",
    },
    {
      id: "term-agent",
      name: "Agent Runner",
      icon: "agent",
      isAgent: true,
    },
  ],
  activeTerminalId: "term-user-1",
  height: 240,
  profiles: [],
  defaultProfileId: getSavedDefaultProfile(),

  toggleTerminal: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  setIsOpen: (isOpen: boolean) => {
    set({ isOpen });
  },

  setActiveTerminalId: (id: string) => {
    set({ activeTerminalId: id, isOpen: true });
  },

  loadProfiles: async () => {
    try {
      const list = await terminalService.getProfiles();
      if (list && list.length > 0) {
        set((state) => {
          const savedId = getSavedDefaultProfile();
          const defaultProf = list.find((p) => p.id === savedId) || list.find((p) => p.id === state.defaultProfileId) || list[0];
          const updatedTerminals = state.terminals.map((t) => {
            if (!t.shellPath && !t.isAgent) {
              const matched = list.find((p) => p.id === t.profileId) || defaultProf;
              return {
                ...t,
                name: matched.name,
                profileId: matched.id,
                shellPath: matched.path,
                shellArgs: matched.args,
                icon: matched.icon,
              };
            }
            return t;
          });

          return {
            profiles: list,
            defaultProfileId: defaultProf.id,
            terminals: updatedTerminals,
          };
        });
      }
    } catch (err) {
      console.error("Failed to load terminal profiles:", err);
    }
  },

  addTerminal: (profile?: TerminalProfile, isAgent?: boolean) => {
    const id = `term-${Date.now()}`;
    const { profiles, defaultProfileId } = get();

    const selectedProfile =
      profile ||
      profiles.find((p) => p.id === defaultProfileId) ||
      profiles[0];

    const terminalName = isAgent
      ? "Agent Runner"
      : selectedProfile
      ? selectedProfile.name
      : "Terminal";

    const newInstance: TerminalInstance = {
      id,
      name: terminalName,
      profileId: selectedProfile?.id,
      shellPath: selectedProfile?.path,
      shellArgs: selectedProfile?.args,
      icon: isAgent ? "agent" : selectedProfile?.icon || "powershell",
      isAgent,
    };

    set((state) => ({
      terminals: [...state.terminals, newInstance],
      activeTerminalId: id,
      isOpen: true,
    }));
    return id;
  },

  switchTerminalProfile: async (id: string, profile: TerminalProfile) => {
    try {
      await terminalService.killTerminal(id);
    } catch (err) {
      console.error(`Error killing terminal ${id} during profile switch:`, err);
    }

    set((state) => ({
      terminals: state.terminals.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            name: profile.name,
            profileId: profile.id,
            shellPath: profile.path,
            shellArgs: profile.args,
            icon: profile.icon,
          };
        }
        return t;
      }),
    }));
  },

  closeTerminal: (id: string) => {
    terminalService.killTerminal(id).catch(() => {});
    set((state) => {
      if (state.terminals.length <= 1) return state;

      const newTerminals = state.terminals.filter((t) => t.id !== id);
      let nextActiveId = state.activeTerminalId;
      if (state.activeTerminalId === id) {
        nextActiveId = newTerminals[0].id;
      }
      return { terminals: newTerminals, activeTerminalId: nextActiveId };
    });
  },

  setDefaultProfileId: (defaultProfileId: string) => {
    try {
      localStorage.setItem("code-lite:default-profile", defaultProfileId);
    } catch {
      // ignore
    }
    set({ defaultProfileId });
  },

  setHeight: (height: number) => {
    set({ height: Math.max(120, Math.min(height, 600)) });
  },
}));

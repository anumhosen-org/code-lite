import { create } from "zustand";

export type ProviderType = "ollama" | "openai-compatible" | "anthropic" | "gemini";

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type WordWrapMode = "off" | "on" | "wordWrapColumn" | "bounded";
export type AutoSaveMode = "off" | "afterDelay" | "onFocusChange";
export type LineNumbersMode = "on" | "off" | "relative";

export interface EditorSettings {
  minimap: boolean;
  wordWrap: WordWrapMode;
  autoSave: AutoSaveMode;
  autoSaveDelay: number;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  lineNumbers: LineNumbersMode;
  bracketPairColorization: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  minimap: false,
  wordWrap: "on",
  autoSave: "off",
  autoSaveDelay: 1000,
  fontSize: 13,
  lineHeight: 20,
  tabSize: 2,
  lineNumbers: "on",
  bracketPairColorization: true,
};

interface SettingsState {
  isModalOpen: boolean;
  activeProvider: ProviderType;
  providers: Record<ProviderType, ProviderConfig>;
  editorSettings: EditorSettings;
  setModalOpen: (open: boolean) => void;
  setActiveProvider: (provider: ProviderType) => void;
  updateProviderConfig: (
    provider: ProviderType,
    config: Partial<ProviderConfig>
  ) => void;
  updateEditorSettings: (partial: Partial<EditorSettings>) => void;
  toggleMinimap: () => void;
  toggleWordWrap: () => void;
  toggleAutoSave: () => void;
}

const DEFAULT_PROVIDERS: Record<ProviderType, ProviderConfig> = {
  ollama: {
    baseUrl: "http://localhost:11434",
    apiKey: "",
    model: "qwen2.5-coder:latest",
  },
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: "",
    model: "claude-3-7-sonnet-20250219",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    model: "gemini-2.0-flash",
  },
};

// Load saved settings from localStorage
function loadSavedSettings(): {
  activeProvider: ProviderType;
  providers: Record<ProviderType, ProviderConfig>;
  editorSettings: EditorSettings;
} {
  let activeProvider: ProviderType = "ollama";
  let providers = DEFAULT_PROVIDERS;
  let editorSettings = DEFAULT_EDITOR_SETTINGS;

  try {
    const raw = localStorage.getItem("codelite_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      activeProvider = parsed.activeProvider || "ollama";
      providers = { ...DEFAULT_PROVIDERS, ...parsed.providers };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }

  try {
    const rawEditor = localStorage.getItem("codelite_editor_settings");
    if (rawEditor) {
      editorSettings = { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(rawEditor) };
    }
  } catch (e) {
    console.error("Failed to load editor settings:", e);
  }

  return { activeProvider, providers, editorSettings };
}

const initial = loadSavedSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  isModalOpen: false,
  activeProvider: initial.activeProvider,
  providers: initial.providers,
  editorSettings: initial.editorSettings,

  setModalOpen: (isModalOpen: boolean) => set({ isModalOpen }),

  setActiveProvider: (activeProvider: ProviderType) => {
    set((state) => {
      const next = { ...state, activeProvider };
      localStorage.setItem(
        "codelite_settings",
        JSON.stringify({ activeProvider, providers: state.providers })
      );
      return next;
    });
  },

  updateProviderConfig: (
    provider: ProviderType,
    partialConfig: Partial<ProviderConfig>
  ) => {
    set((state) => {
      const updated = {
        ...state.providers,
        [provider]: {
          ...state.providers[provider],
          ...partialConfig,
        },
      };
      localStorage.setItem(
        "codelite_settings",
        JSON.stringify({
          activeProvider: state.activeProvider,
          providers: updated,
        })
      );
      return { providers: updated };
    });
  },

  updateEditorSettings: (partial: Partial<EditorSettings>) => {
    set((state) => {
      const updated = { ...state.editorSettings, ...partial };
      try {
        localStorage.setItem(
          "codelite_editor_settings",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return { editorSettings: updated };
    });
  },

  toggleMinimap: () => {
    set((state) => {
      const updated = {
        ...state.editorSettings,
        minimap: !state.editorSettings.minimap,
      };
      try {
        localStorage.setItem(
          "codelite_editor_settings",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return { editorSettings: updated };
    });
  },

  toggleWordWrap: () => {
    set((state) => {
      const nextWrap: WordWrapMode =
        state.editorSettings.wordWrap === "off" ? "on" : "off";
      const updated = {
        ...state.editorSettings,
        wordWrap: nextWrap,
      };
      try {
        localStorage.setItem(
          "codelite_editor_settings",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return { editorSettings: updated };
    });
  },

  toggleAutoSave: () => {
    set((state) => {
      const nextAutoSave: AutoSaveMode =
        state.editorSettings.autoSave === "off" ? "afterDelay" : "off";
      const updated = {
        ...state.editorSettings,
        autoSave: nextAutoSave,
      };
      try {
        localStorage.setItem(
          "codelite_editor_settings",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return { editorSettings: updated };
    });
  },
}));

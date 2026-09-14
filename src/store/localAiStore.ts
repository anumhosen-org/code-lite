import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  HardwareInfo,
  ModelRecommendation,
  EngineInfo,
  LlamaBuildRelease,
  ModelFileInfo,
  SidecarStatus,
  DownloadProgressPayload,
} from "../types";
import { useSettingsStore } from "./settingsStore";

interface LocalAiState {
  hardware: HardwareInfo | null;
  recommendation: ModelRecommendation | null;
  engineInfo: EngineInfo | null;
  releases: LlamaBuildRelease[];
  installedModels: ModelFileInfo[];
  customModelsDir: string;
  sidecarStatus: SidecarStatus | null;
  activeDownload: DownloadProgressPayload | null;
  isDownloadingEngine: boolean;
  isDownloadingModel: boolean;
  isLoadingReleases: boolean;
  isLoadingModels: boolean;
  expandedDashboard: "models" | "engine" | "knowledge" | null;

  // Actions
  fetchHardwareAndEngine: () => Promise<void>;
  fetchReleases: () => Promise<void>;
  fetchSpecificRelease: (tag: string) => Promise<LlamaBuildRelease>;
  downloadEngine: (url: string) => Promise<void>;
  refreshInstalledModels: () => Promise<void>;
  downloadModel: (downloadUrl: string, filename: string) => Promise<void>;
  deleteModel: (filepath: string) => Promise<void>;
  startModelSidecar: (
    modelPath: string,
    options?: {
      port?: number;
      nGpuLayers?: number;
      contextSize?: number;
      threads?: number;
    }
  ) => Promise<void>;
  stopModelSidecar: () => Promise<void>;
  refreshSidecarStatus: () => Promise<void>;
  setCustomModelsDir: (dir: string) => void;
  setExpandedDashboard: (view: "models" | "engine" | "knowledge" | null) => void;
  initListeners: () => Promise<UnlistenFn>;
}

export const useLocalAiStore = create<LocalAiState>((set, get) => ({
  hardware: null,
  recommendation: null,
  engineInfo: null,
  releases: [],
  installedModels: [],
  customModelsDir: localStorage.getItem("code-lite:models-dir") || "",
  sidecarStatus: null,
  activeDownload: null,
  isDownloadingEngine: false,
  isDownloadingModel: false,
  isLoadingReleases: false,
  isLoadingModels: false,
  expandedDashboard: null,

  fetchHardwareAndEngine: async () => {
    try {
      const [hw, eng, status] = await Promise.all([
        invoke<HardwareInfo>("get_hardware_info"),
        invoke<EngineInfo>("get_installed_engine_info"),
        invoke<SidecarStatus>("get_sidecar_status"),
      ]);

      const rec = await invoke<ModelRecommendation>(
        "get_hardware_recommendation",
        { info: hw }
      );

      set({
        hardware: hw,
        engineInfo: eng,
        recommendation: rec,
        sidecarStatus: status,
      });
    } catch (err) {
      console.error("Failed fetching hardware/engine info:", err);
    }
  },

  fetchReleases: async () => {
    set({ isLoadingReleases: true });
    try {
      const rels = await invoke<LlamaBuildRelease[]>("fetch_llama_releases");
      set({ releases: rels, isLoadingReleases: false });
    } catch (err) {
      console.error("Failed fetching llama releases:", err);
      set({ isLoadingReleases: false });
    }
  },

  fetchSpecificRelease: async (tag: string) => {
    set({ isLoadingReleases: true });
    try {
      const rel = await invoke<LlamaBuildRelease>("fetch_specific_release", { tag });
      const existing = get().releases.filter((r) => r.tag_name !== rel.tag_name);
      set({ releases: [rel, ...existing], isLoadingReleases: false });
      return rel;
    } catch (err) {
      console.error("Failed fetching specific release:", err);
      set({ isLoadingReleases: false });
      throw err;
    }
  },

  downloadEngine: async (downloadUrl: string) => {
    if (get().isDownloadingEngine) return;
    set({ isDownloadingEngine: true });
    try {
      await invoke("download_llama_engine", { downloadUrl });
      await get().fetchHardwareAndEngine();
    } catch (err) {
      console.error("Engine download error:", err);
      throw err;
    } finally {
      set({ isDownloadingEngine: false, activeDownload: null });
    }
  },

  refreshInstalledModels: async () => {
    set({ isLoadingModels: true });
    try {
      const customDir = get().customModelsDir.trim() || undefined;
      const list = await invoke<ModelFileInfo[]>("list_installed_models", {
        customDir,
      });
      set({ installedModels: list, isLoadingModels: false });
    } catch (err) {
      console.error("Failed listing models:", err);
      set({ isLoadingModels: false });
    }
  },

  downloadModel: async (downloadUrl: string, filename: string) => {
    if (get().isDownloadingModel) return;
    set({ isDownloadingModel: true });
    try {
      const customDir = get().customModelsDir.trim() || undefined;
      await invoke("download_model_file", {
        downloadUrl,
        filename,
        customDir,
      });
      await get().refreshInstalledModels();
    } catch (err) {
      console.error("Model download error:", err);
      throw err;
    } finally {
      set({ isDownloadingModel: false, activeDownload: null });
    }
  },

  deleteModel: async (filepath: string) => {
    try {
      await invoke("delete_installed_model", { filepath });
      await get().refreshInstalledModels();
    } catch (err) {
      console.error("Failed deleting model:", err);
      throw err;
    }
  },

  startModelSidecar: async (modelPath: string, options) => {
    try {
      const status = await invoke<SidecarStatus>("start_sidecar", {
        modelPath,
        host: "127.0.0.1",
        port: options?.port || 11434,
        nGpuLayers: options?.nGpuLayers ?? 99,
        contextSize: options?.contextSize || 8192,
        threads: options?.threads,
      });

      set({ sidecarStatus: status });

      // Auto-link: set active Agent provider in settingsStore
      const filename = modelPath.split(/[/\\]/).pop() || "local-model";
      const { setActiveProvider, updateProviderConfig } = useSettingsStore.getState();
      setActiveProvider("ollama");
      updateProviderConfig("ollama", {
        baseUrl: `http://${status.host}:${status.port}`,
        model: filename,
      });
    } catch (err) {
      console.error("Failed starting model sidecar:", err);
      throw err;
    }
  },

  stopModelSidecar: async () => {
    try {
      await invoke("stop_sidecar");
      await get().refreshSidecarStatus();
    } catch (err) {
      console.error("Failed stopping sidecar:", err);
    }
  },

  refreshSidecarStatus: async () => {
    try {
      const status = await invoke<SidecarStatus>("get_sidecar_status");
      set({ sidecarStatus: status });
    } catch (err) {
      console.error("Failed refreshing sidecar status:", err);
    }
  },

  setCustomModelsDir: (dir: string) => {
    localStorage.setItem("code-lite:models-dir", dir);
    set({ customModelsDir: dir });
    get().refreshInstalledModels();
  },

  setExpandedDashboard: (view) => {
    set({ expandedDashboard: view });
  },

  initListeners: async () => {
    const unlisten = await listen<DownloadProgressPayload>(
      "download-progress",
      (event) => {
        set({ activeDownload: event.payload });
      }
    );
    return unlisten;
  },
}));

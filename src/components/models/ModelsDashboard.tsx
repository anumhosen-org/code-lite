import React, { useState } from "react";
import {
  VscClose,
  VscSearch,
  VscCloudDownload,
  VscCheck,
  VscTrash,
  VscPlay,
  VscDebugStop,
  VscFolderOpened,
  VscSparkle,
  VscLink,
} from "react-icons/vsc";
import { useLocalAiStore } from "../../store/localAiStore";
import { CURATED_MODELS } from "../../data/curatedModels";
import { fsService } from "../../services/tauri/fs";

export const ModelsDashboard: React.FC = () => {
  const {
    installedModels,
    sidecarStatus,
    activeDownload,
    isDownloadingModel,
    customModelsDir,
    refreshInstalledModels,
    downloadModel,
    deleteModel,
    startModelSidecar,
    stopModelSidecar,
    setCustomModelsDir,
    setExpandedDashboard,
  } = useLocalAiStore();

  const [activeTab, setActiveTab] = useState<"catalog" | "installed" | "custom" | "settings">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("All");
  const [customUrl, setCustomUrl] = useState("");
  const [customFilename, setCustomFilename] = useState("");

  const families = ["All", "Qwen", "DeepSeek", "Llama", "Mistral"];

  const filteredCatalog = CURATED_MODELS.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.family.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFamily =
      selectedFamily === "All" || m.family.toLowerCase() === selectedFamily.toLowerCase();
    return matchesSearch && matchesFamily;
  });

  const isModelInstalled = (filename: string) => {
    return installedModels.some(
      (m) => m.filename.toLowerCase() === filename.toLowerCase()
    );
  };

  const handlePickCustomDir = async () => {
    try {
      const selected = await fsService.pickFolder();
      if (selected) {
        setCustomModelsDir(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customFilename.trim() || isDownloadingModel) return;

    let targetFilename = customFilename.trim();
    if (!targetFilename.toLowerCase().endsWith(".gguf")) {
      targetFilename += ".gguf";
    }

    try {
      await downloadModel(customUrl.trim(), targetFilename);
      setCustomUrl("");
      setCustomFilename("");
      setActiveTab("installed");
    } catch (err) {
      alert(`Download failed: ${err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] bg-vsc-bg border border-vsc-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-vsc-text">
        {/* Top Header */}
        <div className="h-14 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg">
              <VscSparkle />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Local Models & Weights Library</h2>
              <p className="text-[11px] text-gray-400">
                GGUF model management, HuggingFace downloads, and offline agent execution
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpandedDashboard(null)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <VscClose className="text-xl" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="h-10 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar/50 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "catalog"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Curated Catalog ({CURATED_MODELS.length})
            </button>
            <button
              onClick={() => setActiveTab("installed")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "installed"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Installed Models ({installedModels.length})
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "custom"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Download via URL
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Storage Path
            </button>
          </div>

          {/* Active Download Notification */}
          {activeDownload && activeDownload.task_type === "model" && (
            <div className="flex items-center gap-2 text-[11px] text-blue-400">
              <span className="truncate max-w-[140px] font-mono">{activeDownload.filename}</span>
              <span className="font-mono font-semibold">{activeDownload.progress_percent.toFixed(1)}%</span>
              <div className="w-20 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${activeDownload.progress_percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: CURATED CATALOG */}
          {activeTab === "catalog" && (
            <div className="space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-72">
                  <VscSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search models..."
                    className="w-full bg-vsc-sidebar border border-vsc-border rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {families.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFamily(f)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selectedFamily === f
                          ? "bg-blue-600 text-white font-medium"
                          : "bg-vsc-sidebar text-gray-400 hover:text-white border border-vsc-border"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Models Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCatalog.map((model) => {
                  const installed = isModelInstalled(model.filename);

                  return (
                    <div
                      key={model.tag}
                      className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 hover:border-gray-600 transition-colors flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-white">{model.name}</h3>
                              {model.recommendedForCoding && (
                                <span className="px-1.5 py-0.5 bg-blue-900/60 text-blue-300 rounded text-[10px] font-medium">
                                  Coding Star
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono">{model.tag}</span>
                          </div>

                          <span className="text-xs font-mono font-medium text-gray-300">
                            {model.file_size_gb} GB
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                          {model.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-vsc-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                          <span className="px-1.5 py-0.5 bg-gray-800 rounded">{model.quantization}</span>
                          <span className="px-1.5 py-0.5 bg-gray-800 rounded">VRAM: {model.recommended_vram}</span>
                        </div>

                        {installed ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                            <VscCheck /> Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => downloadModel(model.download_url, model.filename)}
                            disabled={isDownloadingModel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <VscCloudDownload />
                            <span>Download GGUF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INSTALLED MODELS */}
          {activeTab === "installed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Total installed weights: {installedModels.length}
                </span>
                <button
                  onClick={() => refreshInstalledModels()}
                  className="px-2.5 py-1 rounded bg-vsc-sidebar border border-vsc-border hover:bg-white/10 text-xs text-gray-300 transition-colors"
                >
                  Refresh Library
                </button>
              </div>

              {installedModels.length === 0 ? (
                <div className="py-16 text-center text-gray-500 space-y-2">
                  <VscFolderOpened className="text-4xl mx-auto text-gray-600" />
                  <p className="text-sm">No local GGUF models installed yet.</p>
                  <button
                    onClick={() => setActiveTab("catalog")}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
                  >
                    Browse Curated Models
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {installedModels.map((model) => {
                    const isRunning =
                      sidecarStatus?.is_running &&
                      sidecarStatus.current_model?.toLowerCase().includes(model.filename.toLowerCase());

                    return (
                      <div
                        key={model.full_path}
                        className={`p-3.5 rounded-lg border transition-colors flex items-center justify-between ${
                          isRunning
                            ? "border-green-500/50 bg-green-950/20"
                            : "border-vsc-border bg-vsc-sidebar/40"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-white">
                              {model.filename}
                            </span>
                            {isRunning && (
                              <span className="px-2 py-0.5 rounded bg-green-900/60 text-green-300 text-[10px] font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Active Agent Model
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            Path: {model.full_path}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono text-gray-300">
                            {model.size_gb.toFixed(2)} GB
                          </span>

                          {isRunning ? (
                            <button
                              onClick={stopModelSidecar}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-medium transition-colors"
                            >
                              <VscDebugStop />
                              <span>Stop Engine</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => startModelSidecar(model.full_path)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                            >
                              <VscPlay />
                              <span>Load for Agent</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${model.filename}?`)) {
                                deleteModel(model.full_path);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
                          >
                            <VscTrash className="text-base" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM URL DOWNLOAD */}
          {activeTab === "custom" && (
            <div className="max-w-xl mx-auto py-8 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Download Custom GGUF Weights</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Download any GGUF quantized model directly from HuggingFace or a direct HTTP link.
                </p>
              </div>

              <form onSubmit={handleCustomDownload} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Direct Download URL (.gguf)
                  </label>
                  <div className="relative">
                    <VscLink className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="url"
                      required
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://huggingface.co/.../resolve/main/model-q4_k_m.gguf"
                      className="w-full bg-vsc-sidebar border border-vsc-border rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Target Local Filename
                  </label>
                  <input
                    type="text"
                    required
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="my-custom-model.gguf"
                    className="w-full bg-vsc-sidebar border border-vsc-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDownloadingModel}
                  className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <VscCloudDownload className="text-base" />
                  <span>Start Model Download</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: STORAGE SETTINGS */}
          {activeTab === "settings" && (
            <div className="max-w-xl mx-auto py-8 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Models Storage Location</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Configure where downloaded and local GGUF models are stored and scanned on your drive.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-3">
                <label className="block text-xs font-medium text-gray-300">
                  Active Models Directory
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customModelsDir}
                    onChange={(e) => setCustomModelsDir(e.target.value)}
                    placeholder="Default: ~/.code-lite/models"
                    className="flex-1 bg-vsc-bg border border-vsc-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handlePickCustomDir}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-vsc-sidebar border border-vsc-border hover:bg-white/10 text-xs font-medium text-white transition-colors"
                  >
                    <VscFolderOpened />
                    <span>Browse</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-500">
                  Leave blank to use the standard default directory (<code>~/.code-lite/models</code>).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

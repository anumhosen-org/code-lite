import React, { useEffect } from "react";
import {
  VscRefresh,
  VscCloudDownload,
  VscPlay,
  VscDebugStop,
  VscTrash,
  VscScreenFull,
  VscCheck,
  VscSparkle,
  VscFolder,
} from "react-icons/vsc";
import { useLocalAiStore } from "../../store/localAiStore";
import { CURATED_MODELS } from "../../data/curatedModels";

export const ModelsSidebarView: React.FC = () => {
  const {
    installedModels,
    sidecarStatus,
    activeDownload,
    isDownloadingModel,
    isLoadingModels,
    refreshInstalledModels,
    downloadModel,
    deleteModel,
    startModelSidecar,
    stopModelSidecar,
    setExpandedDashboard,
  } = useLocalAiStore();

  useEffect(() => {
    refreshInstalledModels();
  }, [refreshInstalledModels]);

  const topCodingModels = CURATED_MODELS.filter((m) => m.recommendedForCoding).slice(0, 6);

  const isModelInstalled = (filename: string) => {
    return installedModels.some(
      (m) => m.filename.toLowerCase() === filename.toLowerCase()
    );
  };

  const handleStartModel = async (modelPath: string) => {
    try {
      await startModelSidecar(modelPath);
    } catch (err) {
      alert(`Failed starting model: ${err}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-vsc-sidebar text-vsc-text select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-vsc-border font-semibold uppercase tracking-wider text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <VscSparkle className="text-blue-400" />
          <span>Local Models</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refreshInstalledModels()}
            disabled={isLoadingModels}
            title="Refresh models"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <VscRefresh className={isLoadingModels ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setExpandedDashboard("models")}
            title="Open Full Models Catalog Dashboard"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <VscScreenFull />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Active Running Model Status */}
        {sidecarStatus && sidecarStatus.is_running && (
          <div className="p-2.5 rounded border border-green-500/40 bg-green-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Active Runtime</span>
              </div>
              <button
                onClick={stopModelSidecar}
                title="Stop / Unload Model"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] transition-colors"
              >
                <VscDebugStop />
                <span>Unload</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-gray-200 break-all">
              {sidecarStatus.current_model?.split(/[/\\]/).pop() || "Loaded Model"}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>Port: {sidecarStatus.port}</span>
              <span>GPU: {sidecarStatus.n_gpu_layers} layers</span>
              <span>Ctx: {sidecarStatus.context_size}</span>
            </div>
            <div className="text-[10px] text-blue-400 font-medium">
              ✓ Connected to Coding Agent
            </div>
          </div>
        )}

        {/* Live Download Progress Card */}
        {activeDownload && activeDownload.task_type === "model" && (
          <div className="p-2.5 rounded border border-blue-500/40 bg-blue-950/20 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-blue-300 truncate max-w-[160px]">
                {activeDownload.filename}
              </span>
              <span className="font-mono text-blue-400">
                {activeDownload.progress_percent.toFixed(1)}%
              </span>
            </div>
            {/* Progress Track */}
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-200"
                style={{ width: `${activeDownload.progress_percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>{activeDownload.speed_mbps.toFixed(1)} MB/s</span>
              <span>
                {(activeDownload.bytes_downloaded / 1024 / 1024 / 1024).toFixed(2)} /{" "}
                {(activeDownload.total_bytes / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
          </div>
        )}

        {/* Installed Models Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
            <span>INSTALLED GGUF ({installedModels.length})</span>
          </div>

          {installedModels.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-gray-700 rounded text-gray-500 space-y-1">
              <VscFolder className="mx-auto text-xl text-gray-600" />
              <p>No local models found</p>
              <p className="text-[10px]">Download a recommended coding model below.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {installedModels.map((model) => {
                const isCurrent =
                  sidecarStatus?.is_running &&
                  sidecarStatus.current_model?.toLowerCase().includes(model.filename.toLowerCase());

                return (
                  <div
                    key={model.full_path}
                    className={`p-2 rounded border transition-colors ${
                      isCurrent
                        ? "border-green-500/50 bg-green-950/10"
                        : "border-vsc-border bg-vsc-bg/60 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-mono text-[11px] text-gray-200 truncate flex-1" title={model.filename}>
                        {model.filename}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                        {model.size_gb.toFixed(1)} GB
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-800">
                      {isCurrent ? (
                        <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                          <VscCheck /> Running
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartModel(model.full_path)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium transition-colors"
                        >
                          <VscPlay />
                          <span>Load for Agent</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Delete ${model.filename}?`)) {
                            deleteModel(model.full_path);
                          }
                        }}
                        title="Delete model file"
                        className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
                      >
                        <VscTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended Coding Models Section */}
        <div className="space-y-2 pt-2 border-t border-vsc-border">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
            <span>RECOMMENDED CODING MODELS</span>
          </div>

          <div className="space-y-1.5">
            {topCodingModels.map((model) => {
              const installed = isModelInstalled(model.filename);

              return (
                <div
                  key={model.tag}
                  className="p-2 rounded border border-vsc-border bg-vsc-bg/40 space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-gray-200 truncate">{model.name}</span>
                      {model.vram_tier && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-blue-300 font-mono flex-shrink-0">
                          {model.vram_tier}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                      {model.file_size_gb} GB
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2">
                    {model.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] px-1 py-0.5 bg-gray-800 text-gray-400 rounded font-mono">
                      {model.quantization} • {model.recommended_vram} VRAM
                    </span>
                    {installed ? (
                      <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                        <VscCheck /> Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => downloadModel(model.download_url, model.filename)}
                        disabled={isDownloadingModel}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-700 hover:bg-blue-600 text-gray-200 hover:text-white text-[10px] transition-colors disabled:opacity-50"
                      >
                        <VscCloudDownload />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Full Dashboard Button */}
        <button
          onClick={() => setExpandedDashboard("models")}
          className="w-full py-1.5 px-2 rounded border border-vsc-border bg-vsc-bg hover:bg-white/5 text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <VscScreenFull />
          <span>Open Full Models Catalog</span>
        </button>
      </div>
    </div>
  );
};

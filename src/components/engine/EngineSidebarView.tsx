import React, { useEffect, useState } from "react";
import {
  VscRefresh,
  VscScreenFull,
  VscServerProcess,
  VscCheck,
  VscWarning,
  VscCloudDownload,
  VscDebugStop,
  VscFlame,
  VscPinned,
} from "react-icons/vsc";
import { useLocalAiStore } from "../../store/localAiStore";

export const EngineSidebarView: React.FC = () => {
  const {
    hardware,
    recommendation,
    engineInfo,
    releases,
    sidecarStatus,
    activeDownload,
    isDownloadingEngine,
    isLoadingReleases,
    fetchHardwareAndEngine,
    fetchReleases,
    downloadEngine,
    stopModelSidecar,
    setExpandedDashboard,
  } = useLocalAiStore();

  const [selectedBuildType, setSelectedBuildType] = useState<"cuda" | "vulkan" | "cpu">("cuda");

  useEffect(() => {
    fetchHardwareAndEngine();
    fetchReleases();
  }, [fetchHardwareAndEngine, fetchReleases]);

  const latestRelease = releases.length > 0 ? releases[0] : null;

  const handleDownloadLatest = () => {
    if (!latestRelease) return;
    const isWindows = latestRelease.current_os === "windows" || navigator.userAgent.includes("Win");
    const url =
      selectedBuildType === "cuda"
        ? (isWindows
            ? (latestRelease.cuda_win_url || latestRelease.cuda_12_4_win_url)
            : (latestRelease.cuda_linux_url || latestRelease.cuda_linux_12_4_url)) || latestRelease.recommended_url
        : selectedBuildType === "vulkan"
        ? (isWindows
            ? latestRelease.vulkan_win_url
            : latestRelease.vulkan_linux_url) || latestRelease.recommended_url
        : (isWindows
            ? latestRelease.cpu_win_url
            : latestRelease.cpu_linux_url) || latestRelease.fallback_url;

    if (url) {
      downloadEngine(url).catch((err) => alert(`Download failed: ${err}`));
    }
  };

  return (
    <div className="h-full flex flex-col bg-vsc-sidebar text-vsc-text select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-vsc-border font-semibold uppercase tracking-wider text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <VscServerProcess className="text-blue-400" />
          <span>Local Engine</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              fetchHardwareAndEngine();
              fetchReleases();
            }}
            disabled={isLoadingReleases}
            title="Refresh hardware & engine status"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <VscRefresh className={isLoadingReleases ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setExpandedDashboard("engine")}
            title="Open Full Engine Dashboard"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <VscScreenFull />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Active Sidecar Runtime Status */}
        {sidecarStatus && sidecarStatus.is_running ? (
          <div className="p-2.5 rounded border border-green-500/40 bg-green-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>llama-server Running</span>
              </div>
              <button
                onClick={stopModelSidecar}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] transition-colors"
              >
                <VscDebugStop />
                <span>Stop</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-gray-200 break-all">
              {sidecarStatus.current_model?.split(/[/\\]/).pop() || "Loaded Model"}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400 font-mono">
              <div>Port: {sidecarStatus.port}</div>
              <div>GPU Offload: {sidecarStatus.n_gpu_layers}</div>
              <div>Context: {sidecarStatus.context_size}</div>
              <div>Threads: {sidecarStatus.threads}</div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded border border-vsc-border bg-vsc-bg/40 flex items-center justify-between text-gray-400">
            <span className="text-[11px]">llama-server: Inactive</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded font-mono">
              Ready on demand
            </span>
          </div>
        )}

        {/* Engine Binary Status & Downloader */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-gray-400">
            ENGINE BINARY (llama.cpp)
          </div>

          {engineInfo?.is_installed ? (
            <div className="p-2.5 rounded border border-vsc-border bg-vsc-bg/40 space-y-1.5">
              <div className="flex items-center gap-1.5 text-green-400 font-medium text-[11px]">
                <VscCheck />
                <span>llama-server Installed</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono truncate" title={engineInfo.exe_path || ""}>
                {engineInfo.exe_path}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded border border-yellow-500/40 bg-yellow-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-yellow-300 font-medium text-[11px]">
                <VscWarning />
                <span>Binary Not Found</span>
              </div>
              <p className="text-[10px] text-gray-400">
                Install pre-built llama-server with Vulkan GPU acceleration to run models offline.
              </p>

              {/* Build Type Toggle */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedBuildType("cuda")}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                    selectedBuildType === "cuda"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                  title="NVIDIA CUDA acceleration (Linux / Windows)"
                >
                  CUDA
                </button>
                <button
                  onClick={() => setSelectedBuildType("vulkan")}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                    selectedBuildType === "vulkan"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                  title="Universal Vulkan GPU acceleration"
                >
                  Vulkan
                </button>
                <button
                  onClick={() => setSelectedBuildType("cpu")}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                    selectedBuildType === "cpu"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                  title="CPU AVX2 fallback"
                >
                  CPU
                </button>
              </div>

              {latestRelease && (
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-0.5">
                  <span>Target: {latestRelease.tag_name}</span>
                  {(latestRelease.is_pinned || latestRelease.tag_name === "b10970") && (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <VscPinned className="text-xs" />
                      <span>Verified Build</span>
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handleDownloadLatest}
                disabled={isDownloadingEngine || !latestRelease}
                className="w-full py-1.5 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <VscCloudDownload />
                <span>
                  {isDownloadingEngine ? "Downloading Engine..." : "Download llama-server"}
                </span>
              </button>
            </div>
          )}

          {/* Engine Download Progress */}
          {activeDownload && activeDownload.task_type === "engine" && (
            <div className="p-2 rounded border border-blue-500/40 bg-blue-950/20 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-blue-300">Extracting & Installing...</span>
                <span className="font-mono text-blue-400">
                  {activeDownload.progress_percent.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${activeDownload.progress_percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hardware Telemetry Card */}
        {hardware && (
          <div className="space-y-2 pt-2 border-t border-vsc-border">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
              <span>HARDWARE TELEMETRY</span>
              <span className="text-[10px] text-green-400 font-mono">Vulkan Active</span>
            </div>

            <div className="p-2.5 rounded border border-vsc-border bg-vsc-bg/40 space-y-2">
              <div className="space-y-0.5">
                <div className="text-[10px] text-gray-500 font-medium">GPU</div>
                <div className="text-[11px] text-gray-200 font-mono truncate" title={hardware.gpu_name}>
                  {hardware.gpu_name}
                </div>
                <div className="text-[10px] text-blue-400 font-mono">
                  ~{hardware.estimated_vram_gb} GB VRAM
                </div>
              </div>

              <div className="space-y-0.5 pt-1 border-t border-gray-800">
                <div className="text-[10px] text-gray-500 font-medium">CPU</div>
                <div className="text-[11px] text-gray-200 font-mono truncate" title={hardware.cpu_name}>
                  {hardware.cpu_name}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {hardware.cpu_cores} Cores • {hardware.free_ram_gb} GB free of {hardware.total_ram_gb} GB RAM
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hardware Recommendation Card */}
        {recommendation && (
          <div className="p-2.5 rounded border border-blue-500/30 bg-blue-950/15 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-[11px]">
              <VscFlame className="text-yellow-400" />
              <span>Recommended Profile</span>
            </div>
            <div className="text-[11px] font-mono text-gray-200">
              Max Size: {recommendation.max_params} ({recommendation.recommended_quant})
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {recommendation.reason}
            </p>
          </div>
        )}

        {/* Expand to Full Dashboard */}
        <button
          onClick={() => setExpandedDashboard("engine")}
          className="w-full py-1.5 px-2 rounded border border-vsc-border bg-vsc-bg hover:bg-white/5 text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <VscScreenFull />
          <span>Open Full Engine Dashboard</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  VscClose,
  VscServerProcess,
  VscCircuitBoard,
  VscCheck,
  VscCloudDownload,
  VscDebugStop,
  VscPulse,
  VscFlame,
  VscSearch,
  VscPinned,
} from "react-icons/vsc";
import { useLocalAiStore } from "../../store/localAiStore";

export const EngineDashboard: React.FC = () => {
  const {
    hardware,
    recommendation,
    engineInfo,
    releases,
    sidecarStatus,
    isDownloadingEngine,
    isLoadingReleases,
    fetchReleases,
    fetchSpecificRelease,
    downloadEngine,
    stopModelSidecar,
    setExpandedDashboard,
  } = useLocalAiStore();

  const [activeTab, setActiveTab] = useState<"hardware" | "releases" | "settings">("hardware");
  const [port, setPort] = useState(11434);
  const [contextSize, setContextSize] = useState(8192);
  const [gpuLayers, setGpuLayers] = useState(99);
  const [releaseSearchQuery, setReleaseSearchQuery] = useState("");
  const [isSearchingSpecific, setIsSearchingSpecific] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] bg-vsc-bg border border-vsc-border rounded-lg shadow-2xl flex flex-col overflow-hidden text-vsc-text">
        {/* Top Header */}
        <div className="h-14 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg">
              <VscServerProcess />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">llama.cpp Engine & Runtime Manager</h2>
              <p className="text-[11px] text-gray-400">
                Process supervision, Vulkan/CUDA GPU acceleration, and hardware profiling
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

        {/* Tabs Bar */}
        <div className="h-10 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar/50 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("hardware")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "hardware"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Hardware Profiler
            </button>
            <button
              onClick={() => setActiveTab("releases")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "releases"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Engine Releases ({releases.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Runtime Parameters
            </button>
          </div>

          {/* Engine Status indicator */}
          <div className="flex items-center gap-2">
            {sidecarStatus?.is_running ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                llama-server running on port {sidecarStatus.port}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Engine inactive</span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: HARDWARE PROFILER */}
          {activeTab === "hardware" && hardware && (
            <div className="space-y-6">
              {/* Telemetry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GPU Card */}
                <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <VscPulse /> GPU Acceleration
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-green-950/60 text-green-400 text-[10px] font-mono">
                      Vulkan Ready
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate" title={hardware.gpu_name}>
                    {hardware.gpu_name}
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-400">
                    {hardware.estimated_vram_gb} <span className="text-xs text-gray-400 font-normal">GB VRAM</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Sufficient to offload 99 layers of 7B-8B Q4_K_M coding models.
                  </p>
                </div>

                {/* CPU Card */}
                <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <VscCircuitBoard /> Processor
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {hardware.os_name}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate" title={hardware.cpu_name}>
                    {hardware.cpu_name}
                  </div>
                  <div className="text-2xl font-mono font-bold text-purple-400">
                    {hardware.cpu_cores} <span className="text-xs text-gray-400 font-normal">Logical Cores</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Multi-threaded token generation fallback with AVX2 support.
                  </p>
                </div>

                {/* RAM Card */}
                <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span className="text-yellow-400">System Memory</span>
                    <span className="text-[10px] font-mono text-gray-400">DDR RAM</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {hardware.free_ram_gb} GB Free
                  </div>
                  <div className="text-2xl font-mono font-bold text-yellow-400">
                    {hardware.total_ram_gb} <span className="text-xs text-gray-400 font-normal">GB Total</span>
                  </div>
                  {/* Gauge */}
                  <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-yellow-500 h-full rounded-full"
                      style={{
                        width: `${((hardware.total_ram_gb - hardware.free_ram_gb) / hardware.total_ram_gb) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Hardware Recommendation Card */}
              {recommendation && (
                <div className="p-5 rounded-lg border border-blue-500/40 bg-blue-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <VscFlame className="text-yellow-400 text-base" />
                    <span>Intelligent Model Fit Analysis</span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    {recommendation.reason}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                    <div className="p-2 rounded bg-black/30 border border-vsc-border">
                      <div className="text-[10px] text-gray-500">MAX RECOMMENDED</div>
                      <div className="text-white font-semibold">{recommendation.max_params}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-vsc-border">
                      <div className="text-[10px] text-gray-500">QUANTIZATION</div>
                      <div className="text-white font-semibold">{recommendation.recommended_quant}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-vsc-border">
                      <div className="text-[10px] text-gray-500">SAFE CONTEXT</div>
                      <div className="text-white font-semibold">{recommendation.max_context_length} Tokens</div>
                    </div>
                    <div className="p-2 rounded bg-black/30 border border-vsc-border">
                      <div className="text-[10px] text-gray-500">BACKEND</div>
                      <div className="text-white font-semibold">{recommendation.recommended_backend}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RELEASES & BINARIES */}
          {activeTab === "releases" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">llama.cpp Engine Builds</h3>
                  <p className="text-xs text-gray-400">
                    Pre-compiled server binaries directly from official ggml-org/llama.cpp releases
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchReleases()}
                    disabled={isLoadingReleases}
                    className="px-3 py-1.5 rounded bg-vsc-sidebar border border-vsc-border hover:bg-white/10 text-xs text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <VscCloudDownload />
                    <span>{isLoadingReleases ? "Checking GitHub..." : "Check Releases"}</span>
                  </button>
                </div>
              </div>

              {/* Release Search & Tag Fetcher */}
              <div className="flex flex-col gap-2">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const tag = releaseSearchQuery.trim();
                    if (!tag) return;
                    setIsSearchingSpecific(true);
                    setSearchError(null);
                    try {
                      await fetchSpecificRelease(tag);
                      setSearchError(null);
                    } catch (err) {
                      setSearchError(String(err));
                    } finally {
                      setIsSearchingSpecific(false);
                    }
                  }}
                  className="relative flex items-center"
                >
                  <VscSearch className="absolute left-3 text-gray-400 pointer-events-none text-sm" />
                  <input
                    type="text"
                    value={releaseSearchQuery}
                    onChange={(e) => {
                      setReleaseSearchQuery(e.target.value);
                      setSearchError(null);
                    }}
                    placeholder="Search releases or enter exact release tag (e.g. b10970, b10969)..."
                    className="w-full bg-vsc-sidebar border border-vsc-border rounded pl-9 pr-24 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  {releaseSearchQuery.trim() && (
                    <button
                      type="submit"
                      disabled={isSearchingSpecific}
                      className="absolute right-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <VscSearch />
                      <span>{isSearchingSpecific ? "Fetching..." : "Fetch Tag"}</span>
                    </button>
                  )}
                </form>

                {searchError && (
                  <div className="p-2 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
                    <span>{searchError}</span>
                    <button onClick={() => setSearchError(null)} className="hover:text-white">
                      <VscClose />
                    </button>
                  </div>
                )}
              </div>

              {/* Active Installed Info */}
              <div className="p-3.5 rounded-lg border border-vsc-border bg-vsc-sidebar/40 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Current Local Binary</span>
                    {engineInfo?.is_installed ? (
                      <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-800 rounded text-[10px] font-medium flex items-center gap-1">
                        <VscCheck /> Installed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-950 text-yellow-300 border border-yellow-800 rounded text-[10px] font-medium">
                        Not Installed
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {engineInfo?.exe_path || "None (~/.code-lite/bin/llama-server.exe)"}
                  </div>
                </div>
              </div>

              {/* Releases Table / Cards */}
              <div className="space-y-3">
                {releases.length === 0 && !isLoadingReleases && (
                  <div className="p-8 text-center border border-dashed border-vsc-border rounded-lg space-y-3">
                    <p className="text-xs text-gray-400">
                      No release builds currently loaded. Check GitHub releases or refresh to load presets.
                    </p>
                    <button
                      onClick={() => fetchReleases()}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white transition-colors"
                    >
                      Fetch llama.cpp Builds
                    </button>
                  </div>
                )}

                {releases
                  .filter((rel) => {
                    const q = releaseSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      rel.tag_name.toLowerCase().includes(q) ||
                      (rel.release_name && rel.release_name.toLowerCase().includes(q))
                    );
                  })
                  .map((rel) => {
                    const isPinned = !!rel.is_pinned || rel.tag_name === "b10970";
                    return (
                      <div
                        key={rel.tag_name}
                        className={`p-4 rounded-lg border space-y-3 transition-colors ${
                          isPinned
                            ? "border-amber-500/50 bg-amber-950/15"
                            : "border-vsc-border bg-vsc-sidebar/40"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-white font-mono">
                              {rel.release_name || rel.tag_name}
                            </span>
                            {isPinned && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center gap-1">
                                <VscPinned className="text-amber-400 text-xs" />
                                <span>Pinned: Verified Linux & Windows CUDA</span>
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {rel.published_at ? rel.published_at.slice(0, 10) : "Official Build"}
                            </span>
                          </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Windows CUDA 12.4 */}
                        {(rel.cuda_12_4_win_url || rel.cuda_win_url) && (
                          <button
                            onClick={() => downloadEngine(rel.cuda_12_4_win_url || rel.cuda_win_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="Windows NVIDIA CUDA 12.4 acceleration (Driver 525+)"
                          >
                            <VscCloudDownload />
                            <span>Win CUDA 12</span>
                          </button>
                        )}
                        {/* Windows CUDA 13.3 */}
                        {rel.cuda_13_3_win_url && (
                          <button
                            onClick={() => downloadEngine(rel.cuda_13_3_win_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="Windows NVIDIA CUDA 13.3 acceleration (Driver 560+)"
                          >
                            <VscCloudDownload />
                            <span>Win CUDA 13</span>
                          </button>
                        )}
                        {/* Linux CUDA 12.8 */}
                        {(rel.cuda_linux_12_4_url || rel.cuda_linux_url) && (
                          <button
                            onClick={() => downloadEngine(rel.cuda_linux_12_4_url || rel.cuda_linux_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="Linux NVIDIA CUDA 12.8 acceleration (Ubuntu/Debian)"
                          >
                            <VscCloudDownload />
                            <span>Linux CUDA 12</span>
                          </button>
                        )}
                        {/* Linux CUDA 13.3 */}
                        {rel.cuda_linux_13_3_url && (
                          <button
                            onClick={() => downloadEngine(rel.cuda_linux_13_3_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-800 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="Linux NVIDIA CUDA 13.3 acceleration (Ubuntu/Debian)"
                          >
                            <VscCloudDownload />
                            <span>Linux CUDA 13</span>
                          </button>
                        )}
                        {/* Vulkan Option */}
                        {(rel.vulkan_win_url || rel.vulkan_linux_url) && (
                          <button
                            onClick={() => downloadEngine(rel.vulkan_win_url || rel.vulkan_linux_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="Universal Vulkan GPU acceleration (AMD / NVIDIA / Intel)"
                          >
                            <VscCloudDownload />
                            <span>Vulkan GPU</span>
                          </button>
                        )}
                        {/* macOS Metal */}
                        {rel.current_os === "macos" && rel.recommended_url && (
                          <button
                            onClick={() => downloadEngine(rel.recommended_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            title="macOS Apple Metal acceleration"
                          >
                            <VscCloudDownload />
                            <span>Apple Metal</span>
                          </button>
                        )}
                        {/* CPU Option */}
                        {(rel.cpu_win_url || rel.cpu_linux_url || rel.fallback_url) && (
                          <button
                            onClick={() => downloadEngine(rel.cpu_win_url || rel.cpu_linux_url || rel.fallback_url)}
                            disabled={isDownloadingEngine}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
                            title="CPU fallback build (AVX2 universal)"
                          >
                            <VscCloudDownload />
                            <span>CPU AVX2</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TAB 3: RUNTIME PARAMETERS */}
          {activeTab === "settings" && (
            <div className="max-w-xl mx-auto py-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Inference Engine Parameters</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Tune GPU layer offloading and context length for optimal agent token generation speed.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-5">
                {/* Port */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-medium text-gray-300">Local API Port</label>
                    <span className="font-mono text-blue-400">{port}</span>
                  </div>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-vsc-bg border border-vsc-border rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-gray-500">Default: 11434 (standard Ollama port)</p>
                </div>

                {/* Context Window */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-medium text-gray-300">Context Window Size</label>
                    <span className="font-mono text-blue-400">{contextSize} Tokens</span>
                  </div>
                  <input
                    type="range"
                    min="2048"
                    max="32768"
                    step="2048"
                    value={contextSize}
                    onChange={(e) => setContextSize(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>2k (Minimal)</span>
                    <span>8k (Default)</span>
                    <span>16k</span>
                    <span>32k (Max)</span>
                  </div>
                </div>

                {/* GPU Layers */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-medium text-gray-300">GPU Offload Layers (-ngl)</label>
                    <span className="font-mono text-blue-400">{gpuLayers} layers</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="99"
                    step="1"
                    value={gpuLayers}
                    onChange={(e) => setGpuLayers(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>0 (CPU Only)</span>
                    <span>33 (Hybrid)</span>
                    <span>99 (All to GPU)</span>
                  </div>
                </div>

                {/* Stop Sidecar button if running */}
                {sidecarStatus?.is_running && (
                  <button
                    onClick={stopModelSidecar}
                    className="w-full py-2 rounded bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <VscDebugStop />
                    <span>Stop Running Engine</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

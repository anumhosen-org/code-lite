export interface HardwareInfo {
  cpu_name: string;
  cpu_cores: number;
  total_ram_gb: number;
  free_ram_gb: number;
  gpu_name: string;
  estimated_vram_gb: number;
  supports_vulkan: boolean;
  os_name: string;
}

export interface ModelRecommendation {
  max_params: string;
  recommended_quant: string;
  max_context_length: number;
  recommended_backend: string;
  reason: string;
}

export interface LlamaAsset {
  name: string;
  download_url: string;
  size_bytes: number;
  asset_type: string;
}

export interface LlamaBuildRelease {
  tag_name: string;
  release_name: string;
  published_at: string;
  html_url: string;
  body: string;
  current_os: string;
  recommended_url: string;
  recommended_label: string;
  fallback_url: string;
  fallback_label: string;
  vulkan_win_url: string;
  cpu_win_url: string;
  cuda_win_url: string;
  cuda_12_4_win_url: string;
  cuda_13_3_win_url: string;
  cuda_linux_url: string;
  cuda_linux_12_4_url: string;
  vulkan_linux_url: string;
  cpu_linux_url: string;
  hip_win_url: string;
  sycl_win_url: string;
  assets: LlamaAsset[];
}

export interface EngineInfo {
  is_installed: boolean;
  exe_path: string | null;
  version: string | null;
}

export interface DownloadProgressPayload {
  task_id: string;
  task_type: "engine" | "model";
  filename: string;
  bytes_downloaded: number;
  total_bytes: number;
  progress_percent: number;
  speed_mbps: number;
  is_complete: boolean;
  error?: string | null;
}

export interface ModelFileInfo {
  filename: string;
  full_path: string;
  size_bytes: number;
  size_gb: number;
  modified_time: string;
}

export interface SidecarStatus {
  is_running: boolean;
  current_model: string | null;
  host: string;
  port: number;
  api_url: string;
  n_gpu_layers: number;
  context_size: number;
  threads: number;
}

export interface CuratedModel {
  name: string;
  tag: string;
  description: string;
  parameter_size: string;
  family: string;
  quantization: string;
  file_size_gb: number;
  download_url: string;
  filename: string;
  recommended_vram: string;
  recommendedForCoding?: boolean;
  vram_tier?: "8GB" | "12GB" | "16GB" | "Compact";
}

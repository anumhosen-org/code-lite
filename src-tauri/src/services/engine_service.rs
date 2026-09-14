use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use tauri::Emitter;
use zip::ZipArchive;
use super::paths_service::get_bin_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub task_id: String,
    pub task_type: String, // "engine" | "model"
    pub filename: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub progress_percent: f64,
    pub speed_mbps: f64,
    pub is_complete: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineInfo {
    pub is_installed: bool,
    pub exe_path: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlamaAsset {
    pub name: String,
    pub download_url: String,
    pub size_bytes: u64,
    pub asset_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlamaBuildRelease {
    pub tag_name: String,
    pub release_name: String,
    pub published_at: String,
    pub html_url: String,
    pub body: String,
    pub current_os: String,
    pub recommended_url: String,
    pub recommended_label: String,
    pub fallback_url: String,
    pub fallback_label: String,
    pub vulkan_win_url: String,
    pub cpu_win_url: String,
    pub cuda_win_url: String,
    pub cuda_12_4_win_url: String,
    pub cuda_13_3_win_url: String,
    pub hip_win_url: String,
    pub sycl_win_url: String,
    pub assets: Vec<LlamaAsset>,
}

pub fn check_binary_installed() -> Option<String> {
    let bin_dir = get_bin_dir();
    let candidates = vec![
        bin_dir.join("llama-server"),
        bin_dir.join("llama-server.exe"),
        bin_dir.join("llama-server-x86_64-pc-windows-msvc.exe"),
        bin_dir.join("bin").join("llama-server"),
        bin_dir.join("bin").join("llama-server.exe"),
        bin_dir.join("build").join("bin").join("llama-server"),
        bin_dir.join("resources").join("llama-server"),
        bin_dir.join("resources").join("llama-server.exe"),
    ];

    for c in candidates {
        if c.exists() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&c, std::fs::Permissions::from_mode(0o755));
            }
            return Some(c.to_string_lossy().to_string());
        }
    }
    None
}

pub fn get_installed_engine_info() -> EngineInfo {
    if let Some(exe_path) = check_binary_installed() {
        EngineInfo {
            is_installed: true,
            exe_path: Some(exe_path),
            version: Some("llama.cpp release build".to_string()),
        }
    } else {
        EngineInfo {
            is_installed: false,
            exe_path: None,
            version: None,
        }
    }
}

fn get_platform_info() -> (&'static str, &'static str) {
    let os = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "windows"
    };

    let arch = if cfg!(target_arch = "aarch64") {
        "arm64"
    } else {
        "x64"
    };

    (os, arch)
}

pub async fn fetch_llama_releases() -> Result<Vec<LlamaBuildRelease>, String> {
    let client = reqwest::Client::builder()
        .user_agent("code-lite-desktop-app")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15")
        .send()
        .await
        .map_err(|e| format!("Failed to reach GitHub API: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned HTTP status: {}", resp.status()));
    }

    let releases_json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub JSON: {}", e))?;

    let (target_os, target_arch) = get_platform_info();
    let mut list = Vec::new();

    if let Some(arr) = releases_json.as_array() {
        for rel in arr {
            let tag_name = rel["tag_name"].as_str().unwrap_or("").to_string();
            let release_name = rel["name"].as_str().unwrap_or(&tag_name).to_string();
            let published_at = rel["published_at"].as_str().unwrap_or("").to_string();
            let html_url = rel["html_url"].as_str().unwrap_or("").to_string();
            let body = rel["body"].as_str().unwrap_or("").to_string();

            let mut vulkan_win_url = String::new();
            let mut cpu_win_url = String::new();
            let mut cuda_win_url = String::new();
            let mut cuda_12_4_win_url = String::new();
            let mut cuda_13_3_win_url = String::new();
            let mut hip_win_url = String::new();
            let mut sycl_win_url = String::new();

            let mut recommended_url = String::new();
            let mut fallback_url = String::new();

            let mut asset_list = Vec::new();

            if let Some(assets) = rel["assets"].as_array() {
                for asset in assets {
                    let name = asset["name"].as_str().unwrap_or("").to_string();
                    let name_lower = name.to_lowercase();
                    let download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                    let size_bytes = asset["size"].as_u64().unwrap_or(0);

                    if !name_lower.ends_with(".zip") {
                        continue;
                    }

                    // Windows assets
                    if name_lower.contains("win") {
                        let mut asset_type = "win_other".to_string();

                        if name_lower.contains("vulkan") {
                            vulkan_win_url = download_url.clone();
                            asset_type = "vulkan".to_string();
                        } else if name_lower.contains("cpu") || name_lower.contains("avx2") {
                            cpu_win_url = download_url.clone();
                            asset_type = "cpu".to_string();
                        } else if name_lower.contains("cuda-12.4") {
                            cuda_12_4_win_url = download_url.clone();
                            cuda_win_url = download_url.clone();
                            asset_type = "cuda_12_4".to_string();
                        } else if name_lower.contains("cuda-13.3") || name_lower.contains("cuda-13") {
                            cuda_13_3_win_url = download_url.clone();
                            if cuda_win_url.is_empty() {
                                cuda_win_url = download_url.clone();
                            }
                            asset_type = "cuda_13_3".to_string();
                        } else if name_lower.contains("hip") || name_lower.contains("radeon") {
                            hip_win_url = download_url.clone();
                            asset_type = "hip_radeon".to_string();
                        } else if name_lower.contains("sycl") {
                            sycl_win_url = download_url.clone();
                            asset_type = "sycl".to_string();
                        }

                        if target_os == "windows" {
                            asset_list.push(LlamaAsset {
                                name: name.clone(),
                                download_url: download_url.clone(),
                                size_bytes,
                                asset_type,
                            });
                        }
                    }

                    // macOS assets
                    if name_lower.contains("macos") || name_lower.contains("osx") {
                        let is_arm64 = name_lower.contains("arm64") || name_lower.contains("aarch64");
                        let asset_type = if is_arm64 {
                            "macos_arm64_metal".to_string()
                        } else {
                            "macos_x64_intel".to_string()
                        };

                        if (target_arch == "arm64" && is_arm64) || (target_arch != "arm64" && !is_arm64) {
                            if recommended_url.is_empty() {
                                recommended_url = download_url.clone();
                            }
                        } else if fallback_url.is_empty() {
                            fallback_url = download_url.clone();
                        }

                        if target_os == "macos" {
                            asset_list.push(LlamaAsset {
                                name: name.clone(),
                                download_url: download_url.clone(),
                                size_bytes,
                                asset_type,
                            });
                        }
                    }

                    // Linux assets
                    if name_lower.contains("ubuntu") || (name_lower.contains("linux") && !name_lower.contains("win")) {
                        let is_arm64 = name_lower.contains("arm64") || name_lower.contains("aarch64");
                        let asset_type = if is_arm64 {
                            "linux_arm64".to_string()
                        } else {
                            "linux_x64".to_string()
                        };

                        if target_os == "linux" {
                            asset_list.push(LlamaAsset {
                                name: name.clone(),
                                download_url: download_url.clone(),
                                size_bytes,
                                asset_type,
                            });
                        }
                    }
                }
            }

            if target_os == "windows" {
                if !vulkan_win_url.is_empty() {
                    recommended_url = vulkan_win_url.clone();
                } else if !cpu_win_url.is_empty() {
                    recommended_url = cpu_win_url.clone();
                }
                fallback_url = cpu_win_url.clone();
            }

            let recommended_label = if target_os == "windows" {
                "Vulkan (AMD/NVIDIA/Intel GPU Acceleration)".to_string()
            } else if target_os == "macos" {
                "Apple Metal (Unified Memory Apple Silicon)".to_string()
            } else {
                "Linux Default Build".to_string()
            };

            let fallback_label = if target_os == "windows" {
                "CPU (Universal AVX2 Fallback)".to_string()
            } else {
                "CPU Fallback".to_string()
            };

            list.push(LlamaBuildRelease {
                tag_name,
                release_name,
                published_at,
                html_url,
                body,
                current_os: target_os.to_string(),
                recommended_url,
                recommended_label,
                fallback_url,
                fallback_label,
                vulkan_win_url,
                cpu_win_url,
                cuda_win_url,
                cuda_12_4_win_url,
                cuda_13_3_win_url,
                hip_win_url,
                sycl_win_url,
                assets: asset_list,
            });
        }
    }

    Ok(list)
}

pub async fn download_llama_engine(
    app: tauri::AppHandle,
    download_url: String,
) -> Result<String, String> {
    let bin_dir = get_bin_dir();
    let zip_path = bin_dir.join("llama-server-engine.zip");

    let client = reqwest::Client::new();
    let res = client
        .get(&download_url)
        .header("User-Agent", "code-lite")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let total_bytes = res.content_length().unwrap_or(0);
    let mut file = File::create(&zip_path).map_err(|e| format!("File creation failed: {}", e))?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    let start_time = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error downloading chunk: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Write failed: {}", e))?;
        downloaded += chunk.len() as u64;

        let elapsed = start_time.elapsed().as_secs_f64();
        let speed_mbps = if elapsed > 0.0 {
            (downloaded as f64 / (1024.0 * 1024.0)) / elapsed
        } else {
            0.0
        };

        let percent = if total_bytes > 0 {
            (downloaded as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        let _ = app.emit(
            "download-progress",
            DownloadProgressPayload {
                task_id: "engine_download".to_string(),
                task_type: "engine".to_string(),
                filename: "llama-server-engine.zip".to_string(),
                bytes_downloaded: downloaded,
                total_bytes,
                progress_percent: (percent * 10.0).round() / 10.0,
                speed_mbps: (speed_mbps * 10.0).round() / 10.0,
                is_complete: false,
                error: None,
            },
        );
    }

    // Extract zip
    let file = File::open(&zip_path).map_err(|e| format!("Failed opening downloaded zip: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed parsing zip: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => bin_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            let _ = std::fs::create_dir_all(&outpath);
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    let _ = std::fs::create_dir_all(p);
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let name = outpath.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                if name.starts_with("llama-") || outpath.extension().is_none() {
                    let _ = std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(0o755));
                }
            }
        }
    }

    let exe = check_binary_installed().ok_or_else(|| "Binary extracted but not found in destination".to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&exe, std::fs::Permissions::from_mode(0o755));
    }

    let _ = app.emit(
        "download-progress",
        DownloadProgressPayload {
            task_id: "engine_download".to_string(),
            task_type: "engine".to_string(),
            filename: "llama-server-engine.zip".to_string(),
            bytes_downloaded: downloaded,
            total_bytes,
            progress_percent: 100.0,
            speed_mbps: 0.0,
            is_complete: true,
            error: None,
        },
    );

    Ok(exe)
}

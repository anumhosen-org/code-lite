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
    pub cuda_linux_url: String,
    pub cuda_linux_12_4_url: String,
    pub cuda_linux_13_3_url: String,
    pub vulkan_linux_url: String,
    pub cpu_linux_url: String,
    pub hip_win_url: String,
    pub sycl_win_url: String,
    pub cudart_win_url: String,
    pub cudart_linux_url: String,
    pub is_pinned: bool,
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

pub fn build_release_from_assets(
    tag_name: String,
    release_name: String,
    published_at: String,
    html_url: String,
    body: String,
    assets: Vec<(String, String, u64)>,
    target_os: &str,
    target_arch: &str,
) -> LlamaBuildRelease {
    let mut vulkan_win_url = String::new();
    let mut cpu_win_url = String::new();
    let mut cuda_win_url = String::new();
    let mut cuda_12_4_win_url = String::new();
    let mut cuda_13_3_win_url = String::new();
    let mut cuda_linux_url = String::new();
    let mut cuda_linux_12_4_url = String::new();
    let mut cuda_linux_13_3_url = String::new();
    let mut vulkan_linux_url = String::new();
    let mut cpu_linux_url = String::new();
    let mut hip_win_url = String::new();
    let mut sycl_win_url = String::new();
    let mut cudart_win_url = String::new();
    let mut cudart_linux_url = String::new();

    let mut recommended_url = String::new();
    let mut fallback_url = String::new();
    let mut asset_list = Vec::new();

    for (name, download_url, size_bytes) in assets {
        let name_lower = name.to_lowercase();

        let is_zip = name_lower.ends_with(".zip");
        let is_tar = name_lower.ends_with(".tar.gz") || name_lower.ends_with(".tgz");
        if !is_zip && !is_tar {
            continue;
        }

        let is_cudart = name_lower.starts_with("cudart");
        let is_bin_package = name_lower.contains("-bin-");
        if !is_bin_package {
            continue;
        }

        let is_arm64 = name_lower.contains("arm64") || name_lower.contains("aarch64");
        let is_x64 = name_lower.contains("x64") || name_lower.contains("x86_64") || (!is_arm64 && !name_lower.contains("s390x"));
        let matches_host_arch = if target_arch == "arm64" { is_arm64 } else { is_x64 };

        // Windows assets
        if name_lower.contains("win") {
            let mut asset_type = if is_cudart { "cudart_runtime".to_string() } else { "win_other".to_string() };

            if is_cudart {
                if matches_host_arch && cudart_win_url.is_empty() {
                    cudart_win_url = download_url.clone();
                }
            } else if name_lower.contains("vulkan") {
                if matches_host_arch {
                    vulkan_win_url = download_url.clone();
                }
                asset_type = "vulkan".to_string();
            } else if name_lower.contains("cpu") || name_lower.contains("avx2") {
                if matches_host_arch {
                    cpu_win_url = download_url.clone();
                }
                asset_type = "cpu".to_string();
            } else if name_lower.contains("cuda-12") || name_lower.contains("cu12") {
                if matches_host_arch {
                    cuda_12_4_win_url = download_url.clone();
                    cuda_win_url = download_url.clone();
                }
                asset_type = "cuda_12".to_string();
            } else if name_lower.contains("cuda-13") || name_lower.contains("cu13") {
                if matches_host_arch {
                    cuda_13_3_win_url = download_url.clone();
                    if cuda_win_url.is_empty() {
                        cuda_win_url = download_url.clone();
                    }
                }
                asset_type = "cuda_13".to_string();
            } else if name_lower.contains("cuda") {
                if matches_host_arch && cuda_win_url.is_empty() {
                    cuda_win_url = download_url.clone();
                }
                asset_type = "cuda".to_string();
            } else if name_lower.contains("hip") || name_lower.contains("rocm") || name_lower.contains("radeon") {
                if matches_host_arch {
                    hip_win_url = download_url.clone();
                }
                asset_type = "hip_radeon".to_string();
            } else if name_lower.contains("sycl") {
                if matches_host_arch {
                    sycl_win_url = download_url.clone();
                }
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

        // Linux assets (Ubuntu / Debian / General Linux)
        if name_lower.contains("ubuntu") || (name_lower.contains("linux") && !name_lower.contains("win")) {
            let is_cuda = name_lower.contains("cuda");
            let is_vulkan = name_lower.contains("vulkan");
            let is_rocm = name_lower.contains("rocm");

            let asset_type = if is_cuda {
                if is_cudart {
                    "linux_cudart_runtime".to_string()
                } else if name_lower.contains("12") {
                    "linux_cuda_12".to_string()
                } else if name_lower.contains("13") {
                    "linux_cuda_13".to_string()
                } else {
                    "linux_cuda".to_string()
                }
            } else if is_vulkan {
                "linux_vulkan".to_string()
            } else if is_rocm {
                "linux_rocm".to_string()
            } else if is_arm64 {
                "linux_arm64".to_string()
            } else {
                "linux_cpu_x64".to_string()
            };

            if is_cudart {
                if matches_host_arch && cudart_linux_url.is_empty() {
                    cudart_linux_url = download_url.clone();
                }
            } else if is_cuda {
                if matches_host_arch {
                    if name_lower.contains("12") {
                        cuda_linux_12_4_url = download_url.clone();
                        if cuda_linux_url.is_empty() {
                            cuda_linux_url = download_url.clone();
                        }
                    } else if name_lower.contains("13") {
                        cuda_linux_13_3_url = download_url.clone();
                        if cuda_linux_url.is_empty() {
                            cuda_linux_url = download_url.clone();
                        }
                    } else if cuda_linux_url.is_empty() {
                        cuda_linux_url = download_url.clone();
                    }
                }
            } else if is_vulkan {
                if matches_host_arch {
                    vulkan_linux_url = download_url.clone();
                }
            } else if !is_rocm && !name_lower.contains("sycl") && !name_lower.contains("openvino") && !name_lower.contains("s390x") {
                if matches_host_arch && cpu_linux_url.is_empty() {
                    cpu_linux_url = download_url.clone();
                }
            }

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

    if target_os == "windows" {
        if !vulkan_win_url.is_empty() {
            recommended_url = vulkan_win_url.clone();
        } else if !cuda_win_url.is_empty() {
            recommended_url = cuda_win_url.clone();
        } else if !cpu_win_url.is_empty() {
            recommended_url = cpu_win_url.clone();
        }
        fallback_url = cpu_win_url.clone();
    } else if target_os == "linux" {
        if !cuda_linux_url.is_empty() {
            recommended_url = cuda_linux_url.clone();
        } else if !vulkan_linux_url.is_empty() {
            recommended_url = vulkan_linux_url.clone();
        } else if !cpu_linux_url.is_empty() {
            recommended_url = cpu_linux_url.clone();
        }
        fallback_url = cpu_linux_url.clone();
    }

    let recommended_label = if target_os == "windows" {
        "Vulkan (AMD/NVIDIA/Intel GPU Acceleration)".to_string()
    } else if target_os == "macos" {
        "Apple Metal (Unified Memory Apple Silicon)".to_string()
    } else if !cuda_linux_url.is_empty() {
        "NVIDIA CUDA (Linux GPU Acceleration)".to_string()
    } else {
        "Linux Default Build".to_string()
    };

    let fallback_label = if target_os == "windows" {
        "CPU (Universal AVX2 Fallback)".to_string()
    } else {
        "CPU Fallback".to_string()
    };

    LlamaBuildRelease {
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
        cuda_linux_url,
        cuda_linux_12_4_url,
        cuda_linux_13_3_url,
        vulkan_linux_url,
        cpu_linux_url,
        hip_win_url,
        sycl_win_url,
        cudart_win_url,
        cudart_linux_url,
        is_pinned: false,
        assets: asset_list,
    }
}

pub fn get_fallback_releases(target_os: &str, target_arch: &str) -> Vec<LlamaBuildRelease> {
    let b10970_files: Vec<(&str, u64)> = vec![
        ("cudart-llama-b10970-bin-ubuntu-cuda-12.8-x64.tar.gz", 594542592),
        ("cudart-llama-b10970-bin-ubuntu-cuda-13.3-arm64.tar.gz", 518000000),
        ("cudart-llama-b10970-bin-ubuntu-cuda-13.3-x64.tar.gz", 410000000),
        ("cudart-llama-bin-win-cuda-12.4-x64.zip", 391118848),
        ("cudart-llama-bin-win-cuda-13.3-x64.zip", 391118848),
        ("cudart-llama-bin-win-cuda-13.4-arm64.zip", 153092096),
        ("llama-b10970-bin-macos-arm64.tar.gz", 11114905),
        ("llama-b10970-bin-macos-x64.tar.gz", 11219763),
        ("llama-b10970-bin-ubuntu-arm64.tar.gz", 13421772),
        ("llama-b10970-bin-ubuntu-cuda-12.8-x64.tar.gz", 168820736),
        ("llama-b10970-bin-ubuntu-cuda-13.3-arm64.tar.gz", 144703488),
        ("llama-b10970-bin-ubuntu-cuda-13.3-x64.tar.gz", 148897792),
        ("llama-b10970-bin-ubuntu-vulkan-arm64.tar.gz", 24222105),
        ("llama-b10970-bin-ubuntu-vulkan-x64.tar.gz", 30198988),
        ("llama-b10970-bin-ubuntu-x64.tar.gz", 16882073),
        ("llama-b10970-bin-win-cpu-arm64.zip", 11953766),
        ("llama-b10970-bin-win-cpu-x64.zip", 18454937),
        ("llama-b10970-bin-win-cuda-12.4-x64.zip", 253755392),
        ("llama-b10970-bin-win-cuda-13.3-x64.zip", 149946368),
        ("llama-b10970-bin-win-cuda-13.4-arm64.zip", 142606336),
        ("llama-b10970-bin-win-vulkan-x64.zip", 31666995),
    ];

    let assets = b10970_files
        .into_iter()
        .map(|(name, size)| {
            let url = format!("https://github.com/ggml-org/llama.cpp/releases/download/b10970/{}", name);
            (name.to_string(), url, size)
        })
        .collect();

    let mut rel = build_release_from_assets(
        "b10970".to_string(),
        "llama.cpp b10970 (Verified Linux & Windows Build)".to_string(),
        "2026-09-14T20:56:00Z".to_string(),
        "https://github.com/ggml-org/llama.cpp/releases/tag/b10970".to_string(),
        "Official verified ggml-org/llama.cpp b10970 release with complete Linux CUDA 12, Linux CUDA 13, Linux Vulkan, and Windows CUDA builds.".to_string(),
        assets,
        target_os,
        target_arch,
    );
    rel.is_pinned = true;
    vec![rel]
}

pub async fn fetch_llama_releases() -> Result<Vec<LlamaBuildRelease>, String> {
    let (target_os, target_arch) = get_platform_info();
    let pinned_b10970 = get_fallback_releases(target_os, target_arch).remove(0);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeLite/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let api_result = client
        .get("https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=15")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await;

    if let Ok(resp) = api_result {
        if resp.status().is_success() {
            if let Ok(releases_json) = resp.json::<serde_json::Value>().await {
                if let Some(arr) = releases_json.as_array() {
                    let mut list = Vec::new();
                    // Always pin the verified b10970 build at the very top for guaranteed Linux CUDA availability
                    list.push(pinned_b10970.clone());

                    for rel in arr {
                        let tag_name = rel["tag_name"].as_str().unwrap_or("").to_string();
                        if tag_name == "b10970" {
                            continue;
                        }

                        let release_name = rel["name"].as_str().unwrap_or(&tag_name).to_string();
                        let published_at = rel["published_at"].as_str().unwrap_or("").to_string();
                        let html_url = rel["html_url"].as_str().unwrap_or("").to_string();
                        let body = rel["body"].as_str().unwrap_or("").to_string();

                        let mut asset_items = Vec::new();
                        if let Some(assets) = rel["assets"].as_array() {
                            for asset in assets {
                                let name = asset["name"].as_str().unwrap_or("").to_string();
                                let download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                                let size_bytes = asset["size"].as_u64().unwrap_or(0);
                                if !name.is_empty() && !download_url.is_empty() {
                                    asset_items.push((name, download_url, size_bytes));
                                }
                            }
                        }

                        list.push(build_release_from_assets(
                            tag_name,
                            release_name,
                            published_at,
                            html_url,
                            body,
                            asset_items,
                            target_os,
                            target_arch,
                        ));
                    }

                    if !list.is_empty() {
                        return Ok(list);
                    }
                }
            }
        }
    }

    // Fallback if GitHub API rate-limits or is unreachable:
    eprintln!("GitHub API unavailable or rate-limited; returning official pinned b10970 release presets.");
    Ok(vec![pinned_b10970])
}

pub async fn fetch_specific_release(tag: String) -> Result<LlamaBuildRelease, String> {
    let (target_os, target_arch) = get_platform_info();
    let mut clean_tag = tag.trim().to_string();
    if clean_tag.is_empty() {
        return Err("Release tag cannot be empty".to_string());
    }
    if !clean_tag.starts_with('b') && !clean_tag.starts_with('v') {
        clean_tag = format!("b{}", clean_tag);
    }

    let is_b10970 = clean_tag == "b10970";

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeLite/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let api_url = format!("https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/{}", clean_tag);
    let api_result = client
        .get(&api_url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await;

    if let Ok(resp) = api_result {
        if resp.status().is_success() {
            if let Ok(rel) = resp.json::<serde_json::Value>().await {
                let tag_name = rel["tag_name"].as_str().unwrap_or(&clean_tag).to_string();
                let release_name = rel["name"].as_str().unwrap_or(&tag_name).to_string();
                let published_at = rel["published_at"].as_str().unwrap_or("").to_string();
                let html_url = rel["html_url"].as_str().unwrap_or("").to_string();
                let body = rel["body"].as_str().unwrap_or("").to_string();

                let mut asset_items = Vec::new();
                if let Some(assets) = rel["assets"].as_array() {
                    for asset in assets {
                        let name = asset["name"].as_str().unwrap_or("").to_string();
                        let download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                        let size_bytes = asset["size"].as_u64().unwrap_or(0);
                        if !name.is_empty() && !download_url.is_empty() {
                            asset_items.push((name, download_url, size_bytes));
                        }
                    }
                }

                let mut release = build_release_from_assets(
                    tag_name,
                    release_name,
                    published_at,
                    html_url,
                    body,
                    asset_items,
                    target_os,
                    target_arch,
                );
                if is_b10970 {
                    release.is_pinned = true;
                }
                return Ok(release);
            }
        }
    }

    // Try expanded assets scraping (bypasses GitHub REST API rate limits)
    let expanded_url = format!("https://github.com/ggml-org/llama.cpp/releases/expanded_assets/{}", clean_tag);
    if let Ok(exp_resp) = client.get(&expanded_url).send().await {
        if exp_resp.status().is_success() {
            if let Ok(html) = exp_resp.text().await {
                let mut asset_items = Vec::new();
                for line in html.lines() {
                    if line.contains("/ggml-org/llama.cpp/releases/download/") {
                        let prefix = format!("/ggml-org/llama.cpp/releases/download/{}/", clean_tag);
                        if let Some(pos) = line.find(&prefix) {
                            let rest = &line[pos + prefix.len()..];
                            if let Some(end) = rest.find('"') {
                                let filename = &rest[..end];
                                let download_url = format!("https://github.com/ggml-org/llama.cpp/releases/download/{}/{}", clean_tag, filename);
                                asset_items.push((filename.to_string(), download_url, 0));
                            }
                        }
                    }
                }

                if !asset_items.is_empty() {
                    let mut release = build_release_from_assets(
                        clean_tag.clone(),
                        format!("llama.cpp {}", clean_tag),
                        "".to_string(),
                        format!("https://github.com/ggml-org/llama.cpp/releases/tag/{}", clean_tag),
                        format!("Found {} release binaries from GitHub for {}", asset_items.len(), clean_tag),
                        asset_items,
                        target_os,
                        target_arch,
                    );
                    if is_b10970 {
                        release.is_pinned = true;
                    }
                    return Ok(release);
                }
            }
        }
    }

    if is_b10970 {
        return Ok(get_fallback_releases(target_os, target_arch).remove(0));
    }

    Err(format!("Could not find release tag '{}' on GitHub", clean_tag))
}

pub async fn download_llama_engine(
    app: tauri::AppHandle,
    download_url: String,
) -> Result<String, String> {
    let bin_dir = get_bin_dir();
    let is_tar_gz = download_url.ends_with(".tar.gz") || download_url.ends_with(".tgz");
    let archive_name = if is_tar_gz {
        "llama-server-engine.tar.gz"
    } else {
        "llama-server-engine.zip"
    };
    let archive_path = bin_dir.join(archive_name);

    let client = reqwest::Client::new();
    let res = client
        .get(&download_url)
        .header("User-Agent", "code-lite")
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let total_bytes = res.content_length().unwrap_or(0);
    let mut file = File::create(&archive_path).map_err(|e| format!("File creation failed: {}", e))?;
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
                filename: archive_name.to_string(),
                bytes_downloaded: downloaded,
                total_bytes,
                progress_percent: (percent * 10.0).round() / 10.0,
                speed_mbps: (speed_mbps * 10.0).round() / 10.0,
                is_complete: false,
                error: None,
            },
        );
    }
    drop(file);

    if is_tar_gz {
        // Native tar extraction supported on Linux, macOS, and Windows 10+
        let status = std::process::Command::new("tar")
            .arg("-xzf")
            .arg(&archive_path)
            .arg("-C")
            .arg(&bin_dir)
            .status()
            .map_err(|e| format!("Failed executing tar extraction: {}", e))?;

        if !status.success() {
            return Err(format!("tar extraction failed with code: {:?}", status.code()));
        }
    } else {
        let file = File::open(&archive_path).map_err(|e| format!("Failed opening downloaded zip: {}", e))?;
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
            }
        }
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(entries) = std::fs::read_dir(&bin_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                if name.starts_with("llama-") || path.extension().is_none() {
                    let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755));
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
            filename: archive_name.to_string(),
            bytes_downloaded: total_bytes,
            total_bytes,
            progress_percent: 100.0,
            speed_mbps: 0.0,
            is_complete: true,
            error: None,
        },
    );

    Ok(exe)
}

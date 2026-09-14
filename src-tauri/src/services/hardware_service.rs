use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub total_ram_gb: f64,
    pub free_ram_gb: f64,
    pub gpu_name: String,
    pub estimated_vram_gb: f64,
    pub supports_vulkan: bool,
    pub os_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRecommendation {
    pub max_params: String,
    pub recommended_quant: String,
    pub max_context_length: usize,
    pub recommended_backend: String,
    pub reason: String,
}

pub fn get_hardware_info() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .unwrap_or_else(|| "Generic x86_64 CPU".to_string());

    let cpu_cores = sys.cpus().len();

    let total_ram_bytes = sys.total_memory();
    let free_ram_bytes = sys.available_memory();

    let total_ram_gb = (total_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    let free_ram_gb = (free_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);

    let os_name = format!(
        "{} {}",
        System::name().unwrap_or_else(|| "Windows".to_string()),
        System::os_version().unwrap_or_else(|| "11".to_string())
    );

    let (gpu_name, estimated_vram_gb) = detect_gpu_vram();

    HardwareInfo {
        cpu_name,
        cpu_cores,
        total_ram_gb: (total_ram_gb * 10.0).round() / 10.0,
        free_ram_gb: (free_ram_gb * 10.0).round() / 10.0,
        gpu_name,
        estimated_vram_gb: (estimated_vram_gb * 10.0).round() / 10.0,
        supports_vulkan: true,
        os_name,
    }
}

fn detect_gpu_vram() -> (String, f64) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("powershell")
            .args(["-Command", "Get-CimInstance Win32_VideoController | Select-Object -Property Name,AdapterRAM | ConvertTo-Json"])
            .output()
        {
            if let Ok(json_str) = String::from_utf8(output.stdout) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    let items = if val.is_array() {
                        val.as_array().cloned().unwrap_or_default()
                    } else if val.is_object() {
                        vec![val]
                    } else {
                        vec![]
                    };

                    for item in items {
                        let name = item["Name"].as_str().unwrap_or_default().to_string();
                        if name.contains("NVIDIA") || name.contains("AMD") || name.contains("Radeon") || name.contains("Intel") || name.contains("RTX") || name.contains("GTX") {
                            let ram_bytes = item["AdapterRAM"].as_u64().unwrap_or(0);
                            let vram_gb = (ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
                            return (name, if vram_gb > 0.5 { vram_gb } else { 6.0 });
                        }
                    }
                }
            }
        }
    }

    ("Vulkan / DirectX Compatible GPU".to_string(), 6.0)
}

pub fn get_hardware_recommendation(info: HardwareInfo) -> ModelRecommendation {
    let memory_pool = if info.estimated_vram_gb > 2.0 {
        info.estimated_vram_gb + (info.free_ram_gb * 0.4)
    } else {
        info.free_ram_gb * 0.7
    };

    if info.estimated_vram_gb >= 15.0 || memory_pool >= 20.0 {
        ModelRecommendation {
            max_params: "14B - 32B".to_string(),
            recommended_quant: "Q4_K_M / Q8_0".to_string(),
            max_context_length: 32768,
            recommended_backend: "Vulkan / CUDA (High Perf)".to_string(),
            reason: format!(
                "Superb hardware detected ({:.1} GB VRAM + {:.1} GB RAM). You can run large coding models like Qwen 2.5 Coder 14B or DeepSeek MoE with full GPU offload.",
                info.estimated_vram_gb, info.total_ram_gb
            ),
        }
    } else if info.estimated_vram_gb >= 7.0 || memory_pool >= 10.0 {
        ModelRecommendation {
            max_params: "7B - 8B".to_string(),
            recommended_quant: "Q4_K_M".to_string(),
            max_context_length: 16384,
            recommended_backend: "Vulkan GPU Acceleration".to_string(),
            reason: format!(
                "Great hardware detected ({:.1} GB VRAM). Perfectly matched for Qwen 2.5 Coder 7B or DeepSeek R1 7B/8B with high token generation speeds.",
                info.estimated_vram_gb
            ),
        }
    } else if info.estimated_vram_gb >= 3.5 || memory_pool >= 6.0 {
        ModelRecommendation {
            max_params: "3B - 7B (hybrid)".to_string(),
            recommended_quant: "Q4_K_M / Q3_K_M".to_string(),
            max_context_length: 8192,
            recommended_backend: "Vulkan / CPU Hybrid".to_string(),
            reason: format!(
                "Balanced system ({:.1} GB VRAM, {:.1} GB RAM). Highly responsive with Qwen 2.5 Coder 1.5B/3B and Llama 3.2 3B.",
                info.estimated_vram_gb, info.free_ram_gb
            ),
        }
    } else {
        ModelRecommendation {
            max_params: "0.5B - 1.5B".to_string(),
            recommended_quant: "Q4_K_M".to_string(),
            max_context_length: 4096,
            recommended_backend: "CPU Multi-threaded".to_string(),
            reason: "Lightweight hardware profile. Ultra-fast local execution with Qwen 2.5 Coder 1.5B or Llama 3.2 1B without heating your system.".to_string(),
        }
    }
}

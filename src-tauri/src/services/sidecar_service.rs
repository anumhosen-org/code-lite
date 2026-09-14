use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::sync::{Arc, Mutex};
use super::engine_service::check_binary_installed;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarStatus {
    pub is_running: bool,
    pub current_model: Option<String>,
    pub host: String,
    pub port: u16,
    pub api_url: String,
    pub n_gpu_layers: i32,
    pub context_size: usize,
    pub threads: usize,
}

#[derive(Clone)]
pub struct SidecarState {
    pub child: Arc<Mutex<Option<std::process::Child>>>,
    pub current_model: Arc<Mutex<Option<String>>>,
    pub current_model_path: Arc<Mutex<Option<String>>>,
    pub host: Arc<Mutex<String>>,
    pub port: Arc<Mutex<u16>>,
    pub n_gpu_layers: Arc<Mutex<i32>>,
    pub context_size: Arc<Mutex<usize>>,
    pub threads: Arc<Mutex<usize>>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            current_model: Arc::new(Mutex::new(None)),
            current_model_path: Arc::new(Mutex::new(None)),
            host: Arc::new(Mutex::new("127.0.0.1".to_string())),
            port: Arc::new(Mutex::new(11434)),
            n_gpu_layers: Arc::new(Mutex::new(99)),
            context_size: Arc::new(Mutex::new(8192)),
            threads: Arc::new(Mutex::new(4)),
        }
    }
}

pub fn stop_sidecar_internal(state: &SidecarState) {
    let mut child_guard = state.child.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    let mut model_guard = state.current_model.lock().unwrap();
    *model_guard = None;
    let mut path_guard = state.current_model_path.lock().unwrap();
    *path_guard = None;
}

pub fn get_sidecar_status_internal(state: &SidecarState) -> SidecarStatus {
    let mut child_guard = state.child.lock().unwrap();

    let is_running = if let Some(ref mut child) = *child_guard {
        match child.try_wait() {
            Ok(None) => true,
            _ => false,
        }
    } else {
        false
    };

    let model = state.current_model.lock().unwrap().clone();
    let host = state.host.lock().unwrap().clone();
    let port = *state.port.lock().unwrap();
    let n_gpu_layers = *state.n_gpu_layers.lock().unwrap();
    let context_size = *state.context_size.lock().unwrap();
    let threads = *state.threads.lock().unwrap();

    let api_url = format!("http://{}:{}", host, port);

    SidecarStatus {
        is_running,
        current_model: model,
        host,
        port,
        api_url,
        n_gpu_layers,
        context_size,
        threads,
    }
}

pub fn start_sidecar_internal(
    state: &SidecarState,
    model_path: &str,
    host: Option<String>,
    port: Option<u16>,
    n_gpu_layers: Option<i32>,
    context_size: Option<usize>,
    threads: Option<usize>,
) -> Result<SidecarStatus, String> {
    stop_sidecar_internal(state);

    let exe_path = check_binary_installed()
        .ok_or_else(|| "llama-server binary is not installed. Please download the engine in the Engine tab first.".to_string())?;

    if !Path::new(model_path).exists() {
        return Err(format!("Model file not found at path: {}", model_path));
    }

    let default_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8);

    let target_host = host.unwrap_or_else(|| "127.0.0.1".to_string());
    let target_port = port.unwrap_or(11434);
    let target_gpu_layers = n_gpu_layers.unwrap_or(99);
    let target_ctx = context_size.unwrap_or(8192);
    let target_threads = threads.unwrap_or(default_threads);

    let filename = Path::new(model_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut cmd = Command::new(&exe_path);
    cmd.arg("-m")
        .arg(model_path)
        .arg("--host")
        .arg(&target_host)
        .arg("--port")
        .arg(target_port.to_string())
        .arg("-ngl")
        .arg(target_gpu_layers.to_string())
        .arg("-c")
        .arg(target_ctx.to_string())
        .arg("-t")
        .arg(target_threads.to_string());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed spawning llama-server process: {}", e))?;

    *state.child.lock().unwrap() = Some(child);
    *state.current_model.lock().unwrap() = Some(filename);
    *state.current_model_path.lock().unwrap() = Some(model_path.to_string());
    *state.host.lock().unwrap() = target_host.clone();
    *state.port.lock().unwrap() = target_port;
    *state.n_gpu_layers.lock().unwrap() = target_gpu_layers;
    *state.context_size.lock().unwrap() = target_ctx;
    *state.threads.lock().unwrap() = target_threads;

    Ok(SidecarStatus {
        is_running: true,
        current_model: Some(model_path.to_string()),
        host: target_host.clone(),
        port: target_port,
        api_url: format!("http://{}:{}", target_host, target_port),
        n_gpu_layers: target_gpu_layers,
        context_size: target_ctx,
        threads: target_threads,
    })
}

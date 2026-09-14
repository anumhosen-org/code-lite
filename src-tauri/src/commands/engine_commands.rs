use crate::services::engine_service::{
    self, EngineInfo, LlamaBuildRelease,
};
use crate::services::hardware_service::{self, HardwareInfo, ModelRecommendation};
use crate::services::model_service::{self, ModelFileInfo};
use crate::services::paths_service;
use crate::services::sidecar_service::{self, SidecarState, SidecarStatus};

#[tauri::command]
pub fn get_hardware_info() -> HardwareInfo {
    hardware_service::get_hardware_info()
}

#[tauri::command]
pub fn get_hardware_recommendation(info: HardwareInfo) -> ModelRecommendation {
    hardware_service::get_hardware_recommendation(info)
}

#[tauri::command]
pub async fn fetch_llama_releases() -> Result<Vec<LlamaBuildRelease>, String> {
    engine_service::fetch_llama_releases().await
}

#[tauri::command]
pub fn check_binary_installed() -> Option<String> {
    engine_service::check_binary_installed()
}

#[tauri::command]
pub fn get_installed_engine_info() -> EngineInfo {
    engine_service::get_installed_engine_info()
}

#[tauri::command]
pub async fn download_llama_engine(
    app: tauri::AppHandle,
    download_url: String,
) -> Result<String, String> {
    engine_service::download_llama_engine(app, download_url).await
}

#[tauri::command]
pub fn list_installed_models(custom_dir: Option<String>) -> Vec<ModelFileInfo> {
    model_service::list_installed_models(custom_dir)
}

#[tauri::command]
pub async fn download_model_file(
    app: tauri::AppHandle,
    download_url: String,
    filename: String,
    custom_dir: Option<String>,
) -> Result<String, String> {
    model_service::download_model_file(app, download_url, filename, custom_dir).await
}

#[tauri::command]
pub fn delete_installed_model(filepath: String) -> Result<(), String> {
    model_service::delete_installed_model(filepath)
}

#[tauri::command]
pub fn get_default_models_dir() -> String {
    paths_service::get_models_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn start_sidecar(
    state: tauri::State<'_, SidecarState>,
    model_path: String,
    host: Option<String>,
    port: Option<u16>,
    n_gpu_layers: Option<i32>,
    context_size: Option<usize>,
    threads: Option<usize>,
) -> Result<SidecarStatus, String> {
    sidecar_service::start_sidecar_internal(
        &state,
        &model_path,
        host,
        port,
        n_gpu_layers,
        context_size,
        threads,
    )
}

#[tauri::command]
pub fn stop_sidecar(state: tauri::State<'_, SidecarState>) -> Result<(), String> {
    sidecar_service::stop_sidecar_internal(&state);
    Ok(())
}

#[tauri::command]
pub fn get_sidecar_status(state: tauri::State<'_, SidecarState>) -> SidecarStatus {
    sidecar_service::get_sidecar_status_internal(&state)
}

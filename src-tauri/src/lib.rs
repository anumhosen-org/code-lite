pub mod commands;
pub mod services;

use commands::fs_commands::*;
use commands::search_commands::*;
use commands::terminal_commands::*;
use commands::window_commands::*;
use commands::engine_commands::*;
use services::pty_service::PtyServiceState;
use services::sidecar_service::{SidecarState, stop_sidecar_internal};
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyServiceState::new())
        .manage(SidecarState::new())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<SidecarState>();
                stop_sidecar_internal(&state);
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            read_dir_tree,
            read_file_content,
            write_file_content,
            create_file_or_folder,
            rename_entry,
            delete_entry,
            read_dir_children,
            reveal_in_explorer,
            pick_folder,
            pick_file,
            search_in_workspace,
            spawn_terminal,
            write_terminal,
            resize_terminal,
            kill_terminal,
            get_terminal_profiles,
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_is_maximized,
            // Engine & Models commands
            get_hardware_info,
            get_hardware_recommendation,
            fetch_llama_releases,
            check_binary_installed,
            get_installed_engine_info,
            download_llama_engine,
            list_installed_models,
            download_model_file,
            delete_installed_model,
            get_default_models_dir,
            start_sidecar,
            stop_sidecar,
            get_sidecar_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

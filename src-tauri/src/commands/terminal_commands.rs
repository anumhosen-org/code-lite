use crate::services::pty_service::{PtyServiceState, TerminalProfile};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_terminal_profiles() -> Vec<TerminalProfile> {
    PtyServiceState::get_available_profiles()
}

#[tauri::command]
pub fn spawn_terminal(
    app: AppHandle,
    state: State<'_, PtyServiceState>,
    id: String,
    cwd: Option<String>,
    shell_path: Option<String>,
    shell_args: Option<Vec<String>>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<(), String> {
    state.spawn_terminal(
        app,
        id,
        cwd,
        shell_path,
        shell_args,
        cols.unwrap_or(80),
        rows.unwrap_or(24),
    )
}

#[tauri::command]
pub fn write_terminal(
    state: State<'_, PtyServiceState>,
    id: String,
    data: String,
) -> Result<(), String> {
    state.write_terminal(&id, &data)
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, PtyServiceState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize_terminal(&id, cols, rows)
}

#[tauri::command]
pub fn kill_terminal(
    state: State<'_, PtyServiceState>,
    id: String,
) -> Result<(), String> {
    state.kill_terminal(&id)
}

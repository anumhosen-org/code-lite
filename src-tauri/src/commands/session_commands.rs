use crate::services::session_history_service::{
    self, AgentMessageRecord, SessionPayload, SessionSummary,
};

#[tauri::command]
pub fn list_workspace_sessions(workspace_path: String) -> Result<Vec<SessionSummary>, String> {
    session_history_service::list_workspace_sessions(&workspace_path)
}

#[tauri::command]
pub fn get_session_messages(session_id: String) -> Result<Vec<AgentMessageRecord>, String> {
    session_history_service::get_session_messages(&session_id)
}

#[tauri::command]
pub fn save_workspace_session(payload: SessionPayload) -> Result<(), String> {
    session_history_service::save_workspace_session(payload)
}

#[tauri::command]
pub fn delete_workspace_session(session_id: String) -> Result<(), String> {
    session_history_service::delete_workspace_session(&session_id)
}

#[tauri::command]
pub fn rename_workspace_session(session_id: String, new_title: String) -> Result<(), String> {
    session_history_service::rename_workspace_session(&session_id, &new_title)
}

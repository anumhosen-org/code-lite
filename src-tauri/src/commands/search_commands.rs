use crate::services::search_service::{SearchMatch, SearchService};

#[tauri::command]
pub fn search_in_workspace(
    workspace_path: String,
    query: String,
    is_regex: Option<bool>,
    case_sensitive: Option<bool>,
    file_filter: Option<String>,
    max_results: Option<usize>,
) -> Result<Vec<SearchMatch>, String> {
    let is_reg = is_regex.unwrap_or(false);
    let case_sens = case_sensitive.unwrap_or(false);
    let limit = max_results.unwrap_or(150);
    SearchService::search_workspace(
        &workspace_path,
        &query,
        is_reg,
        case_sens,
        file_filter.as_deref(),
        limit,
    )
}

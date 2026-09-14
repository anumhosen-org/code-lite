use crate::services::ai_proxy_service::{self, EnrichedPromptResult};
use crate::services::embedding_service::{self, SemanticResult};
use crate::services::knowledge_service::{self, KnowledgeItem};
use crate::services::mcp_service::{self, McpToolInfo};

#[tauri::command]
pub fn query_tauri_knowledge(
    query: String,
    category: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<KnowledgeItem>, String> {
    knowledge_service::search_knowledge(&query, category.as_deref(), limit.unwrap_or(5))
}

#[tauri::command]
pub fn list_all_tauri_knowledge() -> Result<Vec<KnowledgeItem>, String> {
    knowledge_service::list_all_knowledge()
}

#[tauri::command]
pub fn index_workspace_code(workspace_path: String) -> Result<usize, String> {
    embedding_service::index_workspace(&workspace_path)
}

#[tauri::command]
pub fn semantic_search_code(
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SemanticResult>, String> {
    embedding_service::search_code_semantic(&query, limit.unwrap_or(10))
}

#[tauri::command]
pub fn list_mcp_tools() -> Vec<McpToolInfo> {
    mcp_service::get_available_mcp_tools()
}

#[tauri::command]
pub fn enrich_prompt_context(
    system_prompt: String,
    user_message: String,
) -> EnrichedPromptResult {
    ai_proxy_service::enrich_prompt_with_knowledge(&system_prompt, &user_message)
}

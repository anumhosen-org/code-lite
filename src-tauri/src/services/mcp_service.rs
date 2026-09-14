use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use super::paths_service::get_app_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub command: String,
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct McpConfigFile {
    #[serde(default, rename = "mcpServers")]
    pub mcp_servers: HashMap<String, McpServerConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolInfo {
    pub name: String,
    pub description: String,
    pub server_name: String,
    pub parameters: serde_json::Value,
}

pub fn get_mcp_config_path() -> PathBuf {
    get_app_dir().join("mcp_config.json")
}

pub fn load_mcp_config() -> McpConfigFile {
    let path = get_mcp_config_path();
    if !path.exists() {
        // Create default template
        let default_config = McpConfigFile {
            mcp_servers: HashMap::new(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&default_config) {
            let _ = std::fs::write(&path, json);
        }
        return default_config;
    }

    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str::<McpConfigFile>(&content) {
            return cfg;
        }
    }
    McpConfigFile::default()
}

pub fn get_available_mcp_tools() -> Vec<McpToolInfo> {
    let mut tools = Vec::new();

    // Built-in offline MCP tools
    tools.push(McpToolInfo {
        name: "tauri_knowledge_lookup".to_string(),
        description: "Search offline SQLite database for Tauri v2 architectural recipes, IPC patterns, and compiler error solutions.".to_string(),
        server_name: "builtin_tauri_knowledge".to_string(),
        parameters: serde_json::json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "Search keyword or compiler error code (e.g. 'mutex', 'borrow checker', 'capabilities')." },
                "category": { "type": "string", "description": "Optional category filter: 'compiler_errors', 'state_management', 'ipc_commands', 'tauri_architecture'." }
            },
            "required": ["query"]
        }),
    });

    tools.push(McpToolInfo {
        name: "semantic_code_search".to_string(),
        description: "Perform semantic code search across the indexed workspace files.".to_string(),
        server_name: "builtin_code_indexer".to_string(),
        parameters: serde_json::json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "Natural language query or code concept to locate in the project." }
            },
            "required": ["query"]
        }),
    });

    // External configured MCP servers
    let cfg = load_mcp_config();
    for (name, _) in cfg.mcp_servers {
        tools.push(McpToolInfo {
            name: format!("{}_tool", name),
            description: format!("External MCP tool provided by server '{}'", name),
            server_name: name,
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "action": { "type": "string" }
                }
            }),
        });
    }

    tools
}

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use super::knowledge_service::get_db_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticResult {
    pub file_path: String,
    pub relative_path: String,
    pub line_number: usize,
    pub snippet: String,
    pub score: f64,
}

pub fn init_embedding_table() -> Result<(), String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS workspace_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            line_number INTEGER NOT NULL,
            content TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed creating workspace_index table: {}", e))?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_file_path ON workspace_index(file_path)", []);
    Ok(())
}

pub fn index_workspace(workspace_path: &str) -> Result<usize, String> {
    init_embedding_table()?;
    let db_path = get_db_path();
    let mut conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Tx error: {}", e))?;
    tx.execute("DELETE FROM workspace_index", []).map_err(|e| e.to_string())?;

    let mut indexed_count = 0;
    let root = Path::new(workspace_path);

    for entry in WalkDir::new(root)
        .max_depth(8)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "target" && name != "dist"
        })
        .flatten()
    {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if matches!(ext_lower.as_str(), "rs" | "ts" | "tsx" | "js" | "jsx" | "json" | "toml" | "css") {
                    if let Ok(content) = std::fs::read_to_string(path) {
                        let rel_path = path
                            .strip_prefix(root)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .to_string();

                        let lines: Vec<&str> = content.lines().collect();
                        // Index in chunks of ~20 lines
                        let chunk_size = 20;
                        for (i, chunk) in lines.chunks(chunk_size).enumerate() {
                            let line_num = i * chunk_size + 1;
                            let snippet = chunk.join("\n");
                            if snippet.trim().is_empty() {
                                continue;
                            }

                            tx.execute(
                                "INSERT INTO workspace_index (file_path, relative_path, line_number, content)
                                 VALUES (?1, ?2, ?3, ?4)",
                                params![
                                    path.to_string_lossy().to_string(),
                                    rel_path,
                                    line_num as i64,
                                    snippet
                                ],
                            ).map_err(|e| e.to_string())?;

                            indexed_count += 1;
                        }
                    }
                }
            }
        }
    }

    tx.commit().map_err(|e| format!("Commit error: {}", e))?;
    Ok(indexed_count)
}

pub fn search_code_semantic(query: &str, limit: usize) -> Result<Vec<SemanticResult>, String> {
    init_embedding_table()?;
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    let keywords: Vec<String> = query
        .split_whitespace()
        .filter(|w| w.len() > 1)
        .map(|w| format!("%{}%", w.to_lowercase()))
        .collect();

    if keywords.is_empty() {
        return Ok(Vec::new());
    }

    let mut stmt = conn
        .prepare("SELECT file_path, relative_path, line_number, content FROM workspace_index WHERE LOWER(content) LIKE ?1 LIMIT ?2")
        .map_err(|e| format!("Prepare error: {}", e))?;

    let primary_kw = &keywords[0];
    let rows = stmt.query_map(params![primary_kw, (limit * 2) as i64], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)? as usize,
            row.get::<_, String>(3)?,
        ))
    }).map_err(|e| format!("Query error: {}", e))?;

    let mut results = Vec::new();
    for r in rows.flatten() {
        let (file_path, relative_path, line_number, content) = r;
        let content_lower = content.to_lowercase();
        let mut score = 0.0;

        for kw_pattern in &keywords {
            let kw = kw_pattern.trim_matches('%');
            if content_lower.contains(kw) {
                score += 1.0;
            }
        }

        results.push(SemanticResult {
            file_path,
            relative_path,
            line_number,
            snippet: content,
            score,
        });
    }

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(limit);
    Ok(results)
}

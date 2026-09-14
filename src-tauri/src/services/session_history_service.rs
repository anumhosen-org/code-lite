use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use super::paths_service::get_app_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub id: String,
    pub workspace_path: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub model: String,
    pub mode: String,
    pub message_count: usize,
    pub last_message_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessageRecord {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub thought: Option<String>,
    pub tool_calls_json: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPayload {
    pub id: String,
    pub workspace_path: String,
    pub title: String,
    pub model: String,
    pub mode: String,
    pub messages: Vec<AgentMessageRecord>,
}

pub fn get_history_db_path() -> std::path::PathBuf {
    get_app_dir().join("workspace_history.db")
}

pub fn init_session_history_db() -> Result<(), String> {
    let db_path = get_history_db_path();
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open workspace history DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            workspace_path TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            model TEXT NOT NULL,
            mode TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed creating sessions table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            thought TEXT,
            tool_calls_json TEXT,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed creating messages table: {}", e))?;

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_path)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp ASC)", []);

    Ok(())
}

fn normalize_path(path: &str) -> String {
    path.replace('\\', "/").trim_end_matches('/').to_lowercase()
}

pub fn list_workspace_sessions(workspace_path: &str) -> Result<Vec<SessionSummary>, String> {
    let _ = init_session_history_db();
    let db_path = get_history_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("DB open error: {}", e))?;

    let norm_target = normalize_path(workspace_path);

    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_path, title, created_at, updated_at, model, mode,
             (SELECT COUNT(*) FROM messages WHERE session_id = sessions.id) as msg_count,
             (SELECT content FROM messages WHERE session_id = sessions.id ORDER BY timestamp DESC LIMIT 1) as last_msg
             FROM sessions
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Prepare error: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let ws: String = row.get(1)?;
            let title: String = row.get(2)?;
            let created_at: i64 = row.get(3)?;
            let updated_at: i64 = row.get(4)?;
            let model: String = row.get(5)?;
            let mode: String = row.get(6)?;
            let message_count: i64 = row.get(7)?;
            let last_message_preview: Option<String> = row.get(8)?;

            Ok(SessionSummary {
                id,
                workspace_path: ws,
                title,
                created_at,
                updated_at,
                model,
                mode,
                message_count: message_count.max(0) as usize,
                last_message_preview,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut results = Vec::new();
    for row in rows.flatten() {
        if norm_target.is_empty() || normalize_path(&row.workspace_path) == norm_target {
            results.push(row);
        }
    }

    Ok(results)
}

pub fn get_session_messages(session_id: &str) -> Result<Vec<AgentMessageRecord>, String> {
    let _ = init_session_history_db();
    let db_path = get_history_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("DB open error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, session_id, role, content, thought, tool_calls_json, timestamp
             FROM messages
             WHERE session_id = ?1
             ORDER BY timestamp ASC",
        )
        .map_err(|e| format!("Prepare error: {}", e))?;

    let rows = stmt
        .query_map(params![session_id], |row| {
            Ok(AgentMessageRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                thought: row.get(4)?,
                tool_calls_json: row.get(5)?,
                timestamp: row.get(6)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut messages = Vec::new();
    for msg in rows.flatten() {
        messages.push(msg);
    }

    Ok(messages)
}

pub fn save_workspace_session(payload: SessionPayload) -> Result<(), String> {
    let _ = init_session_history_db();
    let db_path = get_history_db_path();
    let mut conn = Connection::open(&db_path).map_err(|e| format!("DB open error: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Transaction error: {}", e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let existing_created_at: Option<i64> = tx
        .query_row(
            "SELECT created_at FROM sessions WHERE id = ?1",
            params![payload.id],
            |row| row.get(0),
        )
        .ok();

    let created_at = existing_created_at.unwrap_or(now);

    tx.execute(
        "INSERT INTO sessions (id, workspace_path, title, created_at, updated_at, model, mode)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
            workspace_path = excluded.workspace_path,
            title = excluded.title,
            updated_at = excluded.updated_at,
            model = excluded.model,
            mode = excluded.mode",
        params![
            payload.id,
            payload.workspace_path,
            payload.title,
            created_at,
            now,
            payload.model,
            payload.mode
        ],
    ).map_err(|e| format!("Failed to upsert session: {}", e))?;

    tx.execute("DELETE FROM messages WHERE session_id = ?1", params![payload.id])
        .map_err(|e| format!("Failed to clear old messages: {}", e))?;

    {
        let mut insert_stmt = tx.prepare(
            "INSERT INTO messages (id, session_id, role, content, thought, tool_calls_json, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        ).map_err(|e| format!("Failed to prepare message insert: {}", e))?;

        for msg in payload.messages {
            insert_stmt.execute(params![
                msg.id,
                payload.id,
                msg.role,
                msg.content,
                msg.thought,
                msg.tool_calls_json,
                msg.timestamp
            ]).map_err(|e| format!("Failed to insert message: {}", e))?;
        }
    }

    tx.commit().map_err(|e| format!("Commit error: {}", e))?;
    Ok(())
}

pub fn delete_workspace_session(session_id: &str) -> Result<(), String> {
    let _ = init_session_history_db();
    let db_path = get_history_db_path();
    let mut conn = Connection::open(&db_path).map_err(|e| format!("DB open error: {}", e))?;

    let tx = conn.transaction().map_err(|e| format!("Transaction error: {}", e))?;
    tx.execute("DELETE FROM messages WHERE session_id = ?1", params![session_id])
        .map_err(|e| format!("Failed deleting messages: {}", e))?;
    tx.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])
        .map_err(|e| format!("Failed deleting session: {}", e))?;
    tx.commit().map_err(|e| format!("Commit error: {}", e))?;

    Ok(())
}

pub fn rename_workspace_session(session_id: &str, new_title: &str) -> Result<(), String> {
    let _ = init_session_history_db();
    let db_path = get_history_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("DB open error: {}", e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    conn.execute(
        "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_title, now, session_id],
    ).map_err(|e| format!("Failed renaming session: {}", e))?;

    Ok(())
}

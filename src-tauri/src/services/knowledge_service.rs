use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use super::paths_service::get_app_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
    pub id: i64,
    pub category: String,
    pub title: String,
    pub description: String,
    pub code_snippet: String,
    pub solution: String,
    pub tags: String,
}

pub fn get_db_path() -> std::path::PathBuf {
    get_app_dir().join("tauri_knowledge.db")
}

pub fn init_knowledge_db() -> Result<(), String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open knowledge DB: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tauri_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            code_snippet TEXT NOT NULL,
            solution TEXT NOT NULL,
            tags TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed creating knowledge table: {}", e))?;

    // Create indexes for fast search
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON tauri_knowledge(category)", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_title ON tauri_knowledge(title)", []);

    // Check if table has data
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tauri_knowledge", [], |row| row.get(0))
        .unwrap_or(0);

    if count == 0 {
        seed_knowledge_db(&conn)?;
    }

    Ok(())
}

fn seed_knowledge_db(conn: &Connection) -> Result<(), String> {
    let seeds = vec![
        (
            "state_management",
            "Tauri v2 Global Thread-Safe State Management",
            "How to store and access mutable application state across commands in Tauri v2 safely with Arc and Mutex.",
            r#"// In Rust backend:
pub struct AppState {
    pub count: std::sync::Mutex<u32>,
}

#[tauri::command]
pub fn increment_counter(state: tauri::State<'_, AppState>) -> Result<u32, String> {
    let mut guard = state.count.lock().map_err(|_| "Poisoned mutex")?;
    *guard += 1;
    Ok(*guard)
}

// In main / lib.rs builder:
tauri::Builder::default()
    .manage(AppState { count: std::sync::Mutex::new(0) })
    .invoke_handler(tauri::generate_handler![increment_counter])"#,
            "Always wrap shared mutable state in std::sync::Mutex or parking_lot::Mutex, call .manage() in the builder setup, and request tauri::State in command parameters.",
            "state, mutex, arc, concurrency, thread-safe, tauri v2"
        ),
        (
            "ipc_commands",
            "Async Tauri Commands & Result Error Handling",
            "Proper pattern for async commands returning JSON-compatible Result types to React / frontend.",
            r#"#[tauri::command]
pub async fn fetch_remote_data(url: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let json = res.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
    Ok(json)
}

// In TypeScript frontend:
import { invoke } from "@tauri-apps/api/core";
try {
  const data = await invoke("fetch_remote_data", { url: "https://api..." });
} catch (err) {
  console.error("IPC error:", err);
}"#,
            "Commands that do I/O or network requests must be declared async, return Result<T, String>, and take parameters matching camelCase JSON keys.",
            "ipc, commands, async, error handling, reqwest, invoke"
        ),
        (
            "compiler_errors",
            "Fix: Borrow Checker E0502 / E0506 with Mutex Guards",
            "Cannot borrow mutable when already borrowed immutably inside match or loop.",
            r#"// Problem:
let mut guard = state.child.lock().unwrap();
if let Some(child) = *guard { // E0507: cannot move out of borrowed content
    child.kill();
}

// Solution: Use Option::take() or as_mut():
let mut guard = state.child.lock().unwrap();
if let Some(mut child) = guard.take() {
    let _ = child.kill();
    let _ = child.wait();
}"#,
            "When dealing with process child handles or Option inside Mutex, use .take() to safely extract ownership without holding an open borrow across statements.",
            "rustc, error, e0502, e0506, e0507, borrow checker, mutex"
        ),
        (
            "compiler_errors",
            "Fix: Windows Process Window Popup (CREATE_NO_WINDOW)",
            "Spawning background CLI or tools on Windows causes annoying black CMD windows to flash.",
            r#"use std::process::Command;

let mut cmd = Command::new("my-tool.exe");
cmd.arg("--flag");

#[cfg(target_os = "windows")]
{
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

let child = cmd.spawn()?;"#,
            "Always attach CREATE_NO_WINDOW (0x08000000) using std::os::windows::process::CommandExt when launching sidecars or background utilities on Windows.",
            "windows, process, cmd, create_no_window, sidecar, background"
        ),
        (
            "window_lifecycle",
            "Custom Window Controls & Frame Borderless Drag",
            "Building custom titlebars and window control buttons in Tauri v2.",
            r#"#[tauri::command]
pub fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

// HTML Drag Region:
// <div data-tauri-drag-region className="cursor-move">Title</div>"#,
            "Use data-tauri-drag-region on non-interactive titlebar containers, and ensure buttons specify data-tauri-drag-region='false' or no-drag class.",
            "window, titlebar, minimize, maximize, close, drag, decor"
        ),
        (
            "tauri_architecture",
            "Tauri v2 Permissions and Capabilities Schema",
            "Configuring src-tauri/capabilities/default.json for plugin permissions.",
            r#"{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Code Lite",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default"
  ]
}"#,
            "In Tauri v2, permissions are declared granularly in capabilities JSON rather than tauri.conf.json allowlist.",
            "capabilities, permissions, security, plugins, tauri v2"
        ),
        (
            "compiler_errors",
            "Fix: Future Cannot Be Sent Between Threads (Send/Sync)",
            "Tokio async task error: `T: Send` is not satisfied when holding a std::sync::MutexGuard across an `.await` boundary.",
            r#"// Problem:
let guard = state.lock().unwrap();
fetch_something().await; // Error: MutexGuard held across await is not Send!
guard.do_something();

// Solution: Drop the guard before .await or use tokio::sync::Mutex:
let data = {
    let guard = state.lock().unwrap();
    guard.get_data().clone()
}; // guard dropped here!
fetch_something(&data).await;"#,
            "Never hold a std::sync::MutexGuard across an .await call. Extract data into a local variable and let the guard drop before awaiting, or switch to tokio::sync::Mutex.",
            "rustc, error, send, sync, tokio, await, future, threads"
        ),
        (
            "ptys_terminal",
            "Cross-Platform PTY Terminal with portable-pty",
            "Spawning pseudo-terminals for PowerShell, Bash, CMD in Tauri desktop applications.",
            r#"use portable_pty::{native_pty_system, PtySize, CommandBuilder};

let pty_system = native_pty_system();
let pair = pty_system.openpty(PtySize {
    rows: 24,
    cols: 80,
    pixel_width: 0,
    pixel_height: 0,
})?;"#,
            "Use portable-pty for robust PTY management across Windows ConPTY and Unix PTYs with non-blocking threads.",
            "pty, terminal, xterm, portable-pty, powershell, cmd"
        ),
        (
            "tauri_architecture",
            "Streaming Large Files & Network Responses with reqwest and events",
            "Emitting real-time progress events from Rust to React without blocking the UI thread.",
            r#"use futures_util::StreamExt;
use tauri::Emitter;

let mut stream = response.bytes_stream();
while let Some(chunk) = stream.next().await {
    let chunk = chunk?;
    file.write_all(&chunk)?;
    let _ = app.emit("download-progress", DownloadProgressPayload { ... });
}"#,
            "Stream binary data using futures_util::StreamExt and emit events to app handle so frontend stores update smoothly.",
            "streaming, reqwest, download, events, emitter, progress"
        ),
        (
            "tauri_architecture",
            "Clean Process Teardown on Window Close / Exit",
            "Ensuring background children (llama-server, pty shells) are killed when window is destroyed.",
            r#".on_window_event(|window, event| {
    if let tauri::WindowEvent::Destroyed = event {
        let state = window.state::<SidecarState>();
        stop_sidecar_internal(&state);
    }
})"#,
            "Handle tauri::WindowEvent::Destroyed to cleanly kill spawned child processes and prevent orphan background processes.",
            "lifecycle, exit, teardown, orphan, child, cleanup"
        )
    ];

    for (category, title, description, code_snippet, solution, tags) in seeds {
        conn.execute(
            "INSERT INTO tauri_knowledge (category, title, description, code_snippet, solution, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![category, title, description, code_snippet, solution, tags],
        ).map_err(|e| format!("Failed seeding knowledge item: {}", e))?;
    }

    Ok(())
}

fn map_knowledge_row(row: &rusqlite::Row) -> rusqlite::Result<KnowledgeItem> {
    Ok(KnowledgeItem {
        id: row.get(0)?,
        category: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        code_snippet: row.get(4)?,
        solution: row.get(5)?,
        tags: row.get(6)?,
    })
}

pub fn search_knowledge(
    query: &str,
    category_filter: Option<&str>,
    limit: usize,
) -> Result<Vec<KnowledgeItem>, String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    let q_lower = format!("%{}%", query.trim().to_lowercase());
    let cat_lower = category_filter.map(|c| c.trim().to_lowercase());

    let sql = if cat_lower.is_some() {
        "SELECT id, category, title, description, code_snippet, solution, tags
         FROM tauri_knowledge
         WHERE (LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?1 OR LOWER(tags) LIKE ?1 OR LOWER(solution) LIKE ?1)
           AND LOWER(category) = ?2
         LIMIT ?3"
    } else {
        "SELECT id, category, title, description, code_snippet, solution, tags
         FROM tauri_knowledge
         WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?1 OR LOWER(tags) LIKE ?1 OR LOWER(solution) LIKE ?1
         LIMIT ?2"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| format!("Prepare error: {}", e))?;

    let rows = if let Some(ref cat) = cat_lower {
        stmt.query_map(params![q_lower, cat, limit as i64], map_knowledge_row)
    } else {
        stmt.query_map(params![q_lower, limit as i64], map_knowledge_row)
    }.map_err(|e| format!("Query error: {}", e))?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

pub fn list_all_knowledge() -> Result<Vec<KnowledgeItem>, String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, category, title, description, code_snippet, solution, tags FROM tauri_knowledge ORDER BY id ASC")
        .map_err(|e| format!("Prepare error: {}", e))?;

    let rows = stmt
        .query_map([], map_knowledge_row)
        .map_err(|e| format!("Query error: {}", e))?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn Child + Send + Sync>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalProfile {
    pub id: String,
    pub name: String,
    pub path: String,
    pub args: Vec<String>,
    pub icon: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TerminalOutputPayload {
    pub id: String,
    pub data: String,
}

#[derive(Default)]
pub struct PtyServiceState {
    pub sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyServiceState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_available_profiles() -> Vec<TerminalProfile> {
        let mut profiles = Vec::new();

        #[cfg(target_os = "windows")]
        {
            // 1. PowerShell 7 (pwsh)
            let pwsh_paths = [
                "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
                "C:\\Program Files\\PowerShell\\6\\pwsh.exe",
            ];
            for path in pwsh_paths {
                if Path::new(path).exists() {
                    profiles.push(TerminalProfile {
                        id: "pwsh".to_string(),
                        name: "PowerShell 7".to_string(),
                        path: path.to_string(),
                        args: vec!["-NoLogo".to_string()],
                        icon: "powershell".to_string(),
                    });
                    break;
                }
            }

            // 2. Windows PowerShell
            let ps_path = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
            if Path::new(ps_path).exists() {
                profiles.push(TerminalProfile {
                    id: "powershell".to_string(),
                    name: "PowerShell".to_string(),
                    path: ps_path.to_string(),
                    args: vec!["-NoLogo".to_string()],
                    icon: "powershell".to_string(),
                });
            }

            // 3. Command Prompt (cmd.exe)
            let cmd_path = "C:\\Windows\\System32\\cmd.exe";
            if Path::new(cmd_path).exists() {
                profiles.push(TerminalProfile {
                    id: "cmd".to_string(),
                    name: "Command Prompt".to_string(),
                    path: cmd_path.to_string(),
                    args: Vec::new(),
                    icon: "cmd".to_string(),
                });
            }

            // 4. Git Bash
            let git_bash_paths = [
                "C:\\Program Files\\Git\\bin\\bash.exe",
                "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
                "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
            ];
            for path in git_bash_paths {
                if Path::new(path).exists() {
                    profiles.push(TerminalProfile {
                        id: "git-bash".to_string(),
                        name: "Git Bash".to_string(),
                        path: path.to_string(),
                        args: vec!["--login".to_string(), "-i".to_string()],
                        icon: "bash".to_string(),
                    });
                    break;
                }
            }

            // 5. WSL
            let wsl_path = "C:\\Windows\\System32\\wsl.exe";
            if Path::new(wsl_path).exists() {
                profiles.push(TerminalProfile {
                    id: "wsl".to_string(),
                    name: "WSL (Linux)".to_string(),
                    path: wsl_path.to_string(),
                    args: Vec::new(),
                    icon: "wsl".to_string(),
                });
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let unix_shells = [
                ("/bin/zsh", "Zsh", "bash"),
                ("/bin/bash", "Bash", "bash"),
                ("/bin/sh", "Sh", "bash"),
                ("/usr/bin/fish", "Fish", "bash"),
            ];
            for (path, name, icon) in unix_shells {
                if Path::new(path).exists() {
                    profiles.push(TerminalProfile {
                        id: name.to_lowercase(),
                        name: name.to_string(),
                        path: path.to_string(),
                        args: Vec::new(),
                        icon: icon.to_string(),
                    });
                }
            }
        }

        if profiles.is_empty() {
            #[cfg(target_os = "windows")]
            profiles.push(TerminalProfile {
                id: "cmd".to_string(),
                name: "Command Prompt".to_string(),
                path: "cmd.exe".to_string(),
                args: Vec::new(),
                icon: "cmd".to_string(),
            });

            #[cfg(not(target_os = "windows"))]
            profiles.push(TerminalProfile {
                id: "sh".to_string(),
                name: "Shell".to_string(),
                path: "/bin/sh".to_string(),
                args: Vec::new(),
                icon: "bash".to_string(),
            });
        }

        profiles
    }

    pub fn spawn_terminal(
        &self,
        app_handle: AppHandle,
        id: String,
        cwd: Option<String>,
        shell_path: Option<String>,
        shell_args: Option<Vec<String>>,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        // If session already exists, do not duplicate
        {
            let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            if sessions.contains_key(&id) {
                return Ok(());
            }
        }

        let pty_system = native_pty_system();
        let cols = cols.max(20);
        let rows = rows.max(5);

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Determine executable path and arguments
        let (exec_path, exec_args) = if let Some(ref sp) = shell_path {
            if Path::new(sp).exists() {
                (sp.clone(), shell_args.unwrap_or_default())
            } else {
                let default_profiles = Self::get_available_profiles();
                let first = default_profiles.first().cloned().unwrap();
                (first.path, first.args)
            }
        } else {
            let default_profiles = Self::get_available_profiles();
            let first = default_profiles.first().cloned().unwrap();
            (first.path, first.args)
        };

        let mut cmd = CommandBuilder::new(&exec_path);
        for arg in &exec_args {
            cmd.arg(arg);
        }

        if let Some(ref dir) = cwd {
            if !dir.is_empty() && Path::new(dir).exists() {
                cmd.cwd(dir);
            }
        }

        cmd.env("TERM", "xterm-256color");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn {}: {}", exec_path, e))?;

        // Crucial in portable-pty on Windows ConPTY: drop slave so child holds it solely
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

        let session = PtySession {
            writer,
            master: pair.master,
            child,
        };

        {
            let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            sessions.insert(id.clone(), session);
        }

        // Spawn background reader thread to stream output via Tauri events
        let thread_id = id.clone();
        let thread_handle = app_handle.clone();
        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                        let event_name = format!("terminal-output-{}", thread_id);
                        let _ = thread_handle.emit(&event_name, TerminalOutputPayload {
                            id: thread_id.clone(),
                            data,
                        });
                    }
                    Err(_) => {
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub fn write_terminal(&self, id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get_mut(id) {
            session
                .writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to terminal: {}", e))?;
            session
                .writer
                .flush()
                .map_err(|e| format!("Failed to flush terminal: {}", e))?;
            Ok(())
        } else {
            Err(format!("Terminal session '{}' not found", id))
        }
    }

    pub fn resize_terminal(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get_mut(id) {
            let cols = cols.max(20);
            let rows = rows.max(5);
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize terminal: {}", e))?;
            Ok(())
        } else {
            Err(format!("Terminal session '{}' not found", id))
        }
    }

    pub fn kill_terminal(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(mut session) = sessions.remove(id) {
            let _ = session.child.kill();
        }
        Ok(())
    }
}

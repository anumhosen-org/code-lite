use crate::services::fs_service::{FileEntry, FsService};

#[tauri::command]
pub fn read_dir_tree(path: String, max_depth: Option<usize>) -> Result<FileEntry, String> {
    let depth = max_depth.unwrap_or(2);
    FsService::read_directory_tree(&path, depth)
}

#[tauri::command]
pub fn read_file_content(
    path: String,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<String, String> {
    FsService::read_file(&path, start_line, end_line)
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    FsService::write_file(&path, &content)
}

#[tauri::command]
pub fn create_file_or_folder(path: String, is_dir: bool) -> Result<(), String> {
    FsService::create_entry(&path, is_dir)
}

#[tauri::command]
pub fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    FsService::rename_entry(&old_path, &new_path)
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    FsService::delete_entry(&path)
}

#[tauri::command]
pub fn read_dir_children(path: String) -> Result<Vec<FileEntry>, String> {
    FsService::read_dir_children(&path)
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch explorer: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select Workspace Folder"
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Write-Output $dialog.SelectedPath
}
"#;
            let output = std::process::Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", script])
                .output()
                .map_err(|e| format!("Failed to open folder dialog: {}", e))?;

            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if path.is_empty() {
                Ok(None)
            } else {
                Ok(Some(path))
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(None)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pick_file() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Open File"
$dialog.Filter = "All Files (*.*)|*.*"
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Write-Output $dialog.FileName
}
"#;
            let output = std::process::Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", script])
                .output()
                .map_err(|e| format!("Failed to open file dialog: {}", e))?;

            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if path.is_empty() {
                Ok(None)
            } else {
                Ok(Some(path))
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(None)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

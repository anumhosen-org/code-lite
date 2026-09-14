use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub children: Option<Vec<FileEntry>>,
}

const IGNORED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    ".gemini",
    ".idea",
    ".vscode",
    "__pycache__",
];

pub struct FsService;

impl FsService {
    pub fn read_directory_tree(path_str: &str, max_depth: usize) -> Result<FileEntry, String> {
        let root_path = PathBuf::from(path_str);
        if !root_path.exists() {
            return Err(format!("Path does not exist: {}", path_str));
        }

        Self::scan_entry(&root_path, 0, max_depth)
    }

    fn scan_entry(path: &Path, current_depth: usize, max_depth: usize) -> Result<FileEntry, String> {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string_lossy().to_string());

        let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();
        let size = if is_dir { 0 } else { metadata.len() };

        let children = if is_dir && current_depth < max_depth {
            let mut entries = Vec::new();
            if let Ok(read_dir) = fs::read_dir(path) {
                let mut dir_items: Vec<PathBuf> = read_dir
                    .filter_map(|res| res.ok().map(|e| e.path()))
                    .collect();

                // Sort: directories first, then alphabetically
                dir_items.sort_by(|a, b| {
                    let a_is_dir = a.is_dir();
                    let b_is_dir = b.is_dir();
                    if a_is_dir != b_is_dir {
                        b_is_dir.cmp(&a_is_dir)
                    } else {
                        a.file_name().cmp(&b.file_name())
                    }
                });

                for item in dir_items {
                    let item_name = item
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    // Check if ignored directory
                    if item.is_dir() && IGNORED_DIRS.contains(&item_name.as_str()) {
                        entries.push(FileEntry {
                            name: item_name,
                            path: item.to_string_lossy().to_string(),
                            is_dir: true,
                            size: 0,
                            children: Some(Vec::new()),
                        });
                        continue;
                    }

                    if let Ok(child_entry) = Self::scan_entry(&item, current_depth + 1, max_depth) {
                        entries.push(child_entry);
                    }
                }
            }
            Some(entries)
        } else if is_dir {
            Some(Vec::new()) // Unexpanded directory placeholder
        } else {
            None
        };

        Ok(FileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            size,
            children,
        })
    }

    pub fn read_file(path_str: &str, start_line: Option<usize>, end_line: Option<usize>) -> Result<String, String> {
        let content = fs::read_to_string(path_str).map_err(|e| format!("Failed to read file {}: {}", path_str, e))?;

        if start_line.is_none() && end_line.is_none() {
            return Ok(content);
        }

        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();

        let start = start_line.unwrap_or(1).saturating_sub(1);
        let end = end_line.unwrap_or(total_lines).min(total_lines);

        if start >= total_lines {
            return Ok(String::new());
        }

        Ok(lines[start..end].join("\n"))
    }

    pub fn write_file(path_str: &str, content: &str) -> Result<(), String> {
        let path = Path::new(path_str);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        fs::write(path, content).map_err(|e| format!("Failed to write file {}: {}", path_str, e))
    }

    pub fn create_entry(path_str: &str, is_dir: bool) -> Result<(), String> {
        let path = Path::new(path_str);
        if is_dir {
            fs::create_dir_all(path).map_err(|e| format!("Failed to create directory: {}", e))
        } else {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
            }
            if !path.exists() {
                fs::write(path, "").map_err(|e| format!("Failed to create empty file: {}", e))?;
            }
            Ok(())
        }
    }

    pub fn rename_entry(old_path_str: &str, new_path_str: &str) -> Result<(), String> {
        let old_p = Path::new(old_path_str);
        let new_p = Path::new(new_path_str);
        if !old_p.exists() {
            return Err(format!("Source path does not exist: {}", old_path_str));
        }
        if let Some(parent) = new_p.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
        fs::rename(old_p, new_p).map_err(|e| format!("Failed to rename {} to {}: {}", old_path_str, new_path_str, e))
    }

    pub fn delete_entry(path_str: &str) -> Result<(), String> {
        let p = Path::new(path_str);
        if !p.exists() {
            return Ok(());
        }
        if p.is_dir() {
            fs::remove_dir_all(p).map_err(|e| format!("Failed to delete directory {}: {}", path_str, e))
        } else {
            fs::remove_file(p).map_err(|e| format!("Failed to delete file {}: {}", path_str, e))
        }
    }

    pub fn read_dir_children(path_str: &str) -> Result<Vec<FileEntry>, String> {
        let path = Path::new(path_str);
        if !path.exists() || !path.is_dir() {
            return Err(format!("Directory does not exist: {}", path_str));
        }

        let mut entries = Vec::new();
        if let Ok(read_dir) = fs::read_dir(path) {
            let mut dir_items: Vec<PathBuf> = read_dir
                .filter_map(|res| res.ok().map(|e| e.path()))
                .collect();

            dir_items.sort_by(|a, b| {
                let a_is_dir = a.is_dir();
                let b_is_dir = b.is_dir();
                if a_is_dir != b_is_dir {
                    b_is_dir.cmp(&a_is_dir)
                } else {
                    a.file_name().cmp(&b.file_name())
                }
            });

            for item in dir_items {
                let item_name = item
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if item.is_dir() && IGNORED_DIRS.contains(&item_name.as_str()) {
                    continue;
                }

                let is_dir = item.is_dir();
                let size = if is_dir {
                    0
                } else {
                    fs::metadata(&item).map(|m| m.len()).unwrap_or(0)
                };

                entries.push(FileEntry {
                    name: item_name,
                    path: item.to_string_lossy().to_string(),
                    is_dir,
                    size,
                    children: if is_dir { Some(Vec::new()) } else { None },
                });
            }
        }
        Ok(entries)
    }
}

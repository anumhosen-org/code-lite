use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    pub file_path: String,
    pub relative_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

const IGNORED_NAMES: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    ".gemini",
    ".idea",
    ".vscode",
    "__pycache__",
    "package-lock.json",
    "bun.lock",
];

pub struct SearchService;

impl SearchService {
    pub fn search_workspace(
        workspace_path: &str,
        query: &str,
        is_regex: bool,
        case_sensitive: bool,
        file_filter: Option<&str>,
        max_results: usize,
    ) -> Result<Vec<SearchMatch>, String> {
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let regex = if is_regex {
            RegexBuilder::new(query)
                .case_insensitive(!case_sensitive)
                .build()
                .map_err(|e| format!("Invalid regex: {}", e))?
        } else {
            let escaped = regex::escape(query);
            RegexBuilder::new(&escaped)
                .case_insensitive(!case_sensitive)
                .build()
                .map_err(|e| format!("Failed to build search query: {}", e))?
        };

        let root = Path::new(workspace_path);
        if !root.exists() {
            return Err(format!("Workspace does not exist: {}", workspace_path));
        }

        let mut matches = Vec::new();

        let walker = WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !IGNORED_NAMES.contains(&name.as_ref())
            });

        for entry in walker.filter_map(|e| e.ok()) {
            if matches.len() >= max_results {
                break;
            }

            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            // Check file filter if provided (e.g., "*.rs", "ts")
            if let Some(filter) = file_filter {
                if !filter.is_empty() {
                    let path_str = path.to_string_lossy();
                    let clean_filter = filter.trim_start_matches('*').trim_start_matches('.');
                    if !path_str.ends_with(clean_filter) {
                        continue;
                    }
                }
            }

            // Skip large files (> 2MB) or files with binary extensions
            if let Ok(meta) = entry.metadata() {
                if meta.len() > 2 * 1024 * 1024 {
                    continue;
                }
            }

            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if matches!(
                ext.as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "ico" | "wasm" | "exe" | "dll" | "pdb" | "zip" | "tar" | "gz" | "bin"
            ) {
                continue;
            }

            if let Ok(file) = File::open(path) {
                let reader = BufReader::new(file);
                for (index, line_result) in reader.lines().enumerate() {
                    if matches.len() >= max_results {
                        break;
                    }
                    if let Ok(line) = line_result {
                        if let Some(m) = regex.find(&line) {
                            let match_start = m.start();
                            let match_end = m.end();
                            let rel_path = path
                                .strip_prefix(root)
                                .unwrap_or(path)
                                .to_string_lossy()
                                .to_string();

                            matches.push(SearchMatch {
                                file_path: path.to_string_lossy().to_string(),
                                relative_path: rel_path,
                                line_number: index + 1,
                                line_content: line,
                                match_start,
                                match_end,
                            });
                        }
                    }
                }
            }
        }

        Ok(matches)
    }
}

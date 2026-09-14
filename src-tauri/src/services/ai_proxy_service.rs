use serde::{Deserialize, Serialize};
use super::knowledge_service::search_knowledge;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichedPromptResult {
    pub enriched_system_prompt: String,
    pub matched_knowledge_count: usize,
}

pub fn enrich_prompt_with_knowledge(system_prompt: &str, user_message: &str) -> EnrichedPromptResult {
    let mut matched_knowledge_count = 0;
    let mut knowledge_blocks = Vec::new();

    // Check keywords in user query
    let words: Vec<&str> = user_message.split_whitespace().collect();
    for word in words {
        let clean = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
        if clean.len() >= 3 && matches!(clean.as_str(), "state" | "mutex" | "ipc" | "command" | "borrow" | "error" | "window" | "tauri" | "capability" | "permission" | "pty" | "terminal" | "stream") {
            if let Ok(results) = search_knowledge(&clean, None, 2) {
                for item in results {
                    if !knowledge_blocks.iter().any(|b: &String| b.contains(&item.title)) {
                        knowledge_blocks.push(format!(
                            "### Offline Knowledge Recipe: {}\nDescription: {}\nSolution Pattern:\n{}\nCode Snippet:\n```rust\n{}\n```",
                            item.title, item.description, item.solution, item.code_snippet
                        ));
                        matched_knowledge_count += 1;
                    }
                }
            }
        }
    }

    if knowledge_blocks.is_empty() {
        return EnrichedPromptResult {
            enriched_system_prompt: system_prompt.to_string(),
            matched_knowledge_count: 0,
        };
    }

    let enriched = format!(
        "{}\n\n=== RELEVANT TAURI v2 OFFLINE KNOWLEDGE BASE ===\n{}\n===============================================",
        system_prompt,
        knowledge_blocks.join("\n\n")
    );

    EnrichedPromptResult {
        enriched_system_prompt: enriched,
        matched_knowledge_count,
    }
}

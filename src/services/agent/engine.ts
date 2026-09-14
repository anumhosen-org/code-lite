import { invoke } from "@tauri-apps/api/core";
import { useAgentStore, ToolCallItem } from "../../store/agentStore";
import { useSettingsStore, ProviderType } from "../../store/settingsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEditorStore } from "../../store/editorStore";
import { streamOpenAICompatible } from "./providers/openaiCompatible";
import { streamAnthropic } from "./providers/anthropic";
import { streamGemini } from "./providers/gemini";
import { executeAgentTool } from "./tools/registry";
import { LLMStreamEvent, ToolCallData } from "./types";

let abortController: AbortController | null = null;

export function stopAgent() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  useAgentStore.getState().setIsRunning(false);
}

function cleanAssistantText(text: string): string {
  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/```(?:json)?\s*\{\s*"(?:name|tool)"[\s\S]*?\}\s*```/gi, "")
    .replace(/\{\s*"(?:name|tool)"\s*:\s*"(?:read_file|list_dir|grep_search|edit_file|write_file|run_terminal_command|lookup_tauri_knowledge|semantic_code_search)"[\s\S]*?\}\s*\}?/gi, "")
    .trim();
}

function buildSystemPrompt(): string {
  const workspacePath = useWorkspaceStore.getState().workspacePath;
  const activeTabId = useEditorStore.getState().activeTabId;
  const activeTab = useEditorStore.getState().tabs.find((t) => t.id === activeTabId);

  let activeFileContext = "No active file opened in editor.";
  if (activeTab && !activeTab.diffMode) {
    activeFileContext = `Active file: ${activeTab.filePath} (${activeTab.language})`;
  }

  return `You are Code Lite Agent, an autonomous, elite coding AI embedded directly in the Code Lite IDE.
Current Workspace Directory: "${workspacePath}".
${activeFileContext}

You have direct access to tools to inspect, understand, edit, build, and fix the codebase:
- "read_file": Read file content (parameters: path, start_line, end_line).
- "list_dir": Scan directory trees (parameters: path, depth).
- "grep_search": Fast ripgrep search for symbols, regexes, or functions across the project (parameters: query, is_regex, file_filter).
- "edit_file": Make surgical replacement of target_content with replacement_content (parameters: path, target_content, replacement_content).
- "write_file": Write or create complete file (parameters: path, content).
- "run_terminal_command": Run terminal commands in the integrated terminal, e.g. tests or cargo (parameters: command).
- "lookup_tauri_knowledge": Search offline SQLite knowledge base for Tauri v2 architectural patterns, IPC commands, and compiler error playbooks (parameters: query, category).
- "semantic_code_search": Search indexed workspace code semantically (parameters: query).

CRITICAL AUTONOMOUS RULES (FOR SMALL LOCAL MODELS):
1. NEVER explain or list instructions on what tools the user should run.
2. Whenever asked to "check the code base", "find", "review", "debug", or "edit", you MUST EXECUTE the appropriate tools immediately on turn 1.
3. You can invoke tools via native tool calling OR format them inside an inline block:
<tool_call>
{"name": "tool_name", "arguments": {"arg": "val"}}
</tool_call>

EXAMPLES OF AUTONOMOUS TOOL CALLING:
User: "check my code base"
Assistant:
I will inspect the workspace structure first.
<tool_call>
{"name": "list_dir", "arguments": {"depth": 2}}
</tool_call>

User: "where is the window minimize command implemented?"
Assistant:
Searching the workspace for window minimize logic.
<tool_call>
{"name": "grep_search", "arguments": {"query": "window_minimize"}}
</tool_call>

User: "how do I fix borrow checker error E0507 in my state mutex?"
Assistant:
Let me search our offline Tauri compiler error playbook for E0507 solutions.
<tool_call>
{"name": "lookup_tauri_knowledge", "arguments": {"query": "borrow checker", "category": "compiler_errors"}}
</tool_call>`;
}

export async function runAgentLoop(userPrompt: string): Promise<void> {
  const { addMessage, updateMessage, addToolCallToMessage, updateToolCall, setIsRunning } =
    useAgentStore.getState();
  const { activeProvider, providers } = useSettingsStore.getState();
  const config = providers[activeProvider];

  abortController = new AbortController();
  setIsRunning(true);

  // Add User Message to Chat
  addMessage({
    role: "user",
    content: userPrompt,
  });

  // Prepare Conversation Context
  const history = useAgentStore.getState().messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const baseSystemPrompt = buildSystemPrompt();
  let enrichedSystemPrompt = baseSystemPrompt;

  // Enrich with offline knowledge RAG if relevant
  try {
    const enrichResult = await invoke<{ enriched_system_prompt: string; matched_knowledge_count: number }>(
      "enrich_prompt_context",
      {
        systemPrompt: baseSystemPrompt,
        userMessage: userPrompt,
      }
    );
    if (enrichResult && enrichResult.matched_knowledge_count > 0) {
      enrichedSystemPrompt = enrichResult.enriched_system_prompt;
    }
  } catch {
    // Fallback to base prompt if IPC fails
  }

  const messagesToSend = [
    { role: "system", content: enrichedSystemPrompt },
    ...history,
  ];

  let turn = 0;
  const maxTurns = 12;

  while (turn < maxTurns && useAgentStore.getState().isRunning) {
    turn++;

    // Create a new Assistant Message for this step
    const assistantMessageId = addMessage({
      role: "assistant",
      content: "",
      thought: "",
      toolCalls: [],
    });

    let currentContent = "";
    let currentThought = "";
    const toolCallsToExecute: ToolCallData[] = [];

    try {
      const stream = getProviderStream(activeProvider, messagesToSend, config);

      for await (const event of stream) {
        if (abortController?.signal.aborted) {
          break;
        }

        if (event.type === "text" && event.content) {
          currentContent += event.content;
          updateMessage(assistantMessageId, { content: currentContent });
        } else if (event.type === "thought" && event.content) {
          currentThought += event.content;
          updateMessage(assistantMessageId, { thought: currentThought });
        } else if (event.type === "tool_call" && event.toolCall) {
          toolCallsToExecute.push(event.toolCall);
          const toolCallItem: ToolCallItem = {
            id: event.toolCall.id,
            name: event.toolCall.name,
            args: event.toolCall.arguments,
            status: "pending",
          };
          addToolCallToMessage(assistantMessageId, toolCallItem);
        } else if (event.type === "error") {
          currentContent += `\n\n⚠️ **Error:** ${event.error}`;
          updateMessage(assistantMessageId, { content: currentContent });
          break;
        }
      }
    } catch (err: any) {
      updateMessage(assistantMessageId, {
        content: `${currentContent}\n\n⚠️ **Execution Error:** ${err.message || String(err)}`,
      });
      break;
    }

    if (abortController?.signal.aborted) {
      break;
    }

    // Clean inline tool JSON from assistant message if tools were executed
    if (toolCallsToExecute.length > 0) {
      const cleaned = cleanAssistantText(currentContent);
      updateMessage(assistantMessageId, { content: cleaned });
    }

    // If no tool calls were generated, the turn is done
    if (toolCallsToExecute.length === 0) {
      break;
    }

    // Execute each tool call
    let toolResultsSummary = "";
    for (const toolCall of toolCallsToExecute) {
      updateToolCall(assistantMessageId, toolCall.id, { status: "running" });

      const result = await executeAgentTool(toolCall.name, toolCall.arguments, toolCall.id);

      updateToolCall(assistantMessageId, toolCall.id, {
        status: "completed",
        output: result,
      });

      toolResultsSummary += `Tool [${toolCall.name}] Output:\n${result}\n\n`;
    }

    // Append tool output to messages for next turn
    messagesToSend.push({
      role: "assistant",
      content: currentContent || `Executing: ${toolCallsToExecute.map((t) => t.name).join(", ")}`,
    });
    messagesToSend.push({
      role: "user",
      content: `Tool Execution Results:\n${toolResultsSummary}\nPlease proceed with the next action or provide your final analysis/conclusion.`,
    });
  }

  setIsRunning(false);
  abortController = null;
}

function getProviderStream(
  provider: ProviderType,
  messages: Array<{ role: string; content: string }>,
  config: any
): AsyncGenerator<LLMStreamEvent> {
  switch (provider) {
    case "anthropic":
      return streamAnthropic(messages, config);
    case "gemini":
      return streamGemini(messages, config);
    case "ollama":
    case "openai-compatible":
    default:
      return streamOpenAICompatible(messages, config);
  }
}

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

function buildSystemPrompt(): string {
  const workspacePath = useWorkspaceStore.getState().workspacePath;
  const activeTabId = useEditorStore.getState().activeTabId;
  const activeTab = useEditorStore.getState().tabs.find((t) => t.id === activeTabId);

  let activeFileContext = "No active file opened in editor.";
  if (activeTab && !activeTab.diffMode) {
    activeFileContext = `Active file: ${activeTab.filePath} (${activeTab.language})`;
  }

  return `You are Code Lite Agent, an autonomous, expert software engineering assistant embedded directly inside the Code Lite IDE.
Your current workspace directory is: "${workspacePath}".
${activeFileContext}

You have access to powerful tools to inspect and modify the project:
- "read_file": Inspect file contents with optional line slices.
- "list_dir": Scan directory trees.
- "grep_search": Fast ripgrep search for symbols, regexes, and code snippets across the workspace.
- "edit_file": Make surgical search/replace modifications to existing files.
- "write_file": Write or create complete files.
- "run_terminal_command": Run terminal commands in the integrated Agent Terminal (e.g. tests, builds).

Operational Guidelines:
1. Always inspect files or search the codebase with tools before modifying code.
2. Be precise and concise. When editing code, provide exact target_content matches.
3. When using tools, state your intent clearly.
4. If a task requires multiple steps, work step-by-step, validating your actions as you proceed.`;
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

  const systemPrompt = buildSystemPrompt();
  const messagesToSend = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  let turn = 0;
  const maxTurns = 10;

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
      content: `Here are the tool results:\n${toolResultsSummary}\nPlease proceed with the next step or conclude your answer.`,
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

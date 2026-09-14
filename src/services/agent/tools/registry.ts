import { invoke } from "@tauri-apps/api/core";
import { AgentToolDefinition } from "../types";
import { fsService } from "../../tauri/fs";
import { searchService } from "../../tauri/search";
import { terminalService } from "../../tauri/terminal";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useEditorStore } from "../../../store/editorStore";
import { useAgentStore } from "../../../store/agentStore";
import { useTerminalStore } from "../../../store/terminalStore";

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path with optional line numbers.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The full path to the file." },
        start_line: { type: "number", description: "Optional 1-based start line number." },
        end_line: { type: "number", description: "Optional 1-based end line number." },
      },
      required: ["path"],
    },
  },
  {
    name: "list_dir",
    description: "List directory structure and file names in the workspace or specific folder.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to list. Defaults to workspace root if omitted." },
        depth: { type: "number", description: "Max recursion depth (default 2)." },
      },
    },
  },
  {
    name: "grep_search",
    description: "Perform a fast ripgrep search for text or regex across workspace files.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The text string or regex pattern to search for." },
        is_regex: { type: "boolean", description: "Whether query is a regex." },
        file_filter: { type: "string", description: "Optional extension or file filter, e.g. '*.rs' or 'ts'." },
      },
      required: ["query"],
    },
  },
  {
    name: "edit_file",
    description: "Replace exact target content with replacement content in a file. Proposes a visual diff in the editor.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Target file path." },
        target_content: { type: "string", description: "The exact substring/block of code to be replaced." },
        replacement_content: { type: "string", description: "The new code to replace the target content with." },
      },
      required: ["path", "target_content", "replacement_content"],
    },
  },
  {
    name: "write_file",
    description: "Overwrite an entire file or create a new file with full content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Target file path." },
        content: { type: "string", description: "Complete file contents to write." },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_terminal_command",
    description: "Execute a shell command in the integrated Agent Terminal and observe the output.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run, e.g. 'cargo build' or 'npm test'." },
      },
      required: ["command"],
    },
  },
  {
    name: "lookup_tauri_knowledge",
    description: "Search offline SQLite knowledge base for Tauri v2 architectural recipes, IPC patterns, and compiler error playbooks.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword or error code (e.g. 'mutex', 'borrow checker', 'capabilities', 'window drag')." },
        category: { type: "string", description: "Optional category: 'compiler_errors', 'state_management', 'ipc_commands', 'tauri_architecture', 'window_lifecycle'." },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_code_search",
    description: "Perform fast semantic search across indexed workspace source code.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or natural language concept to locate in the project." },
      },
      required: ["query"],
    },
  },
];

export async function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  toolCallId: string
): Promise<string> {
  const workspacePath = useWorkspaceStore.getState().workspacePath;

  switch (toolName) {
    case "read_file": {
      const filePath = args.path;
      const startLine = args.start_line ? Number(args.start_line) : undefined;
      const endLine = args.end_line ? Number(args.end_line) : undefined;
      try {
        const content = await fsService.readFileContent(filePath, startLine, endLine);
        return content || "(File is empty)";
      } catch (err: any) {
        return `Error reading file: ${err.message || String(err)}`;
      }
    }

    case "list_dir": {
      const dirPath = args.path || workspacePath;
      const depth = args.depth ? Number(args.depth) : 2;
      try {
        const tree = await fsService.readDirTree(dirPath, depth);
        return JSON.stringify(tree, null, 2);
      } catch (err: any) {
        return `Error listing directory: ${err.message || String(err)}`;
      }
    }

    case "grep_search": {
      const query = args.query;
      const isRegex = Boolean(args.is_regex);
      const fileFilter = args.file_filter;
      try {
        const results = await searchService.searchInWorkspace(
          workspacePath,
          query,
          isRegex,
          false,
          fileFilter
        );
        if (results.length === 0) return "No matching lines found.";
        return results
          .slice(0, 50)
          .map((m) => `${m.relative_path}:${m.line_number}: ${m.line_content.trim()}`)
          .join("\n");
      } catch (err: any) {
        return `Error during search: ${err.message || String(err)}`;
      }
    }

    case "edit_file": {
      const filePath = args.path;
      const targetContent = args.target_content;
      const replacementContent = args.replacement_content;
      try {
        const original = await fsService.readFileContent(filePath);
        if (!original.includes(targetContent)) {
          return `Error: Target content was not found in ${filePath}. Verify the file contents first.`;
        }
        const proposed = original.replace(targetContent, replacementContent);
        const { autoApply, addPendingDiff } = useAgentStore.getState();
        const { openDiffTab } = useEditorStore.getState();

        if (autoApply) {
          await fsService.writeFileContent(filePath, proposed);
          await useWorkspaceStore.getState().refreshTree();
          return `Successfully applied edits directly to ${filePath}.`;
        } else {
          // Propose diff in editor
          openDiffTab(filePath, original, proposed);
          addPendingDiff({
            id: `diff-${Date.now()}`,
            filePath,
            originalContent: original,
            proposedContent: proposed,
            toolCallId,
          });
          return `Proposed edit opened in Monaco Diff Editor for user review: ${filePath}`;
        }
      } catch (err: any) {
        return `Error editing file: ${err.message || String(err)}`;
      }
    }

    case "write_file": {
      const filePath = args.path;
      const content = args.content;
      try {
        let original = "";
        try {
          original = await fsService.readFileContent(filePath);
        } catch {
          // File may not exist yet
        }
        const { autoApply, addPendingDiff } = useAgentStore.getState();
        const { openDiffTab } = useEditorStore.getState();

        if (autoApply || !original) {
          await fsService.writeFileContent(filePath, content);
          await useWorkspaceStore.getState().refreshTree();
          return `Successfully wrote file to ${filePath}.`;
        } else {
          openDiffTab(filePath, original, content);
          addPendingDiff({
            id: `diff-${Date.now()}`,
            filePath,
            originalContent: original,
            proposedContent: content,
            toolCallId,
          });
          return `Proposed file overwrite opened in Monaco Diff Editor for user review: ${filePath}`;
        }
      } catch (err: any) {
        return `Error writing file: ${err.message || String(err)}`;
      }
    }

    case "run_terminal_command": {
      const command = args.command;
      try {
        useTerminalStore.getState().setActiveTerminalId("term-agent");
        // Write command with newline to agent terminal
        await terminalService.writeTerminal("term-agent", `${command}\r\n`);
        return `Command submitted to Agent Terminal: '${command}'`;
      } catch (err: any) {
        return `Error running command: ${err.message || String(err)}`;
      }
    }

    case "lookup_tauri_knowledge": {
      try {
        const results = await invoke<any[]>("query_tauri_knowledge", {
          query: args.query,
          category: args.category || null,
          limit: 3,
        });
        if (!results || results.length === 0) {
          return `No specific offline knowledge recipes found for "${args.query}".`;
        }
        return results
          .map(
            (r) =>
              `### [${r.category.toUpperCase()}] ${r.title}\n${r.description}\n\n**Solution Pattern:**\n${r.solution}\n\n**Code Snippet:**\n\`\`\`rust\n${r.code_snippet}\n\`\`\``
          )
          .join("\n\n---\n\n");
      } catch (err: any) {
        return `Error searching knowledge base: ${err.message || String(err)}`;
      }
    }

    case "semantic_code_search": {
      try {
        const results = await invoke<any[]>("semantic_search_code", {
          query: args.query,
          limit: 5,
        });
        if (!results || results.length === 0) {
          return `No semantic code matches found for "${args.query}". Use grep_search for exact keyword searching.`;
        }
        return results
          .map((r) => `File: ${r.relative_path}:${r.line_number}\n\`\`\`\n${r.snippet}\n\`\`\``)
          .join("\n\n---\n\n");
      } catch (err: any) {
        return `Error in semantic code search: ${err.message || String(err)}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

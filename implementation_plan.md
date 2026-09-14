# Implementation Plan: Code Lite - Lightweight Agentic Code Editor

Rebuild a high-performance, lightweight VS Code alternative using Tauri 2.0, React, Tailwind CSS, and Monaco Editor, featuring a native autonomous coding agent that fuses the best capabilities of **OpenCode** (multi-turn tool execution loop, ripgrep search, diff patching, terminal execution) and **Continue** (universal multi-provider LLM support for Ollama, OpenAI-compatible, Claude, Gemini, and rich `@file` context integration).

## User Review Required

> [!IMPORTANT]
> **Key Decisions Agreed Upon During `/grill-me`**:
> 1. **Operational Model**: Autonomous tool-calling agent with file reading, ripgrep searching, diff editing, and terminal command execution.
> 2. **LLM Connectivity**: Universal multi-provider engine (Ollama, LM Studio, DeepSeek, vLLM, OpenRouter, OpenAI, Anthropic Claude, and Google Gemini).
> 3. **Editor Engine**: Monaco Editor with syntax highlighting, VS Code themes, keybindings, and Monaco Diff Editor for reviewing agent edits.
> 4. **Terminal Architecture**: Dual-mode terminal powered by Rust `portable-pty` and `@xterm/xterm`, supporting user interactive shell and streaming agent execution.
> 5. **File Edit Review**: Interactive Monaco Diff view with Accept/Reject controls, plus an optional Auto-apply toggle for autonomous flows.
> 6. **Context Retrieval**: Native Rust ripgrep and file tree traversal tools, combined with `@file` and `@selection` prompt mentions.
> 7. **Layout**: Dedicated right-hand collapsible Agent panel (Cursor/Continue style), left Activity Bar + collapsible Sidebar (Explorer & Search), central Monaco Editor with tabs, and bottom collapsible Terminal panel.

> [!NOTE]
> Per user rules, `cargo check` will **NOT** be executed, and no files will be automatically deleted. Window controls strictly use `react-icons/vsc` (`VscChrome*`), and styling strictly adheres to Tailwind CSS gray scale.

---

## Proposed Changes

### Phase 1: Frontend Stack & Design System Foundation

Set up React 18, Tailwind CSS, `@monaco-editor/react`, `@xterm/xterm`, `react-icons`, and `zustand`.

#### [MODIFY] [package.json](file:///d:/Development/TAURI/Code%20Lite/package.json)
- Add frontend dependencies:
  - `react`, `react-dom`
  - `@types/react`, `@types/react-dom`
  - `@vitejs/plugin-react`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `zustand`
  - `react-icons`
  - `@monaco-editor/react`, `monaco-editor`
  - `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
  - `lucide-react` (if needed, but `react-icons` prioritized per rules)

#### [NEW] [tailwind.config.js](file:///d:/Development/TAURI/Code%20Lite/tailwind.config.js)
- Configure Tailwind with dark mode (`class`), VS Code custom gray-scale palette (dark theme default: `#1e1e1e`, `#252526`, `#333333`, `#2d2d2d`), and font families.

#### [NEW] [postcss.config.js](file:///d:/Development/TAURI/Code%20Lite/postcss.config.js)
- Setup PostCSS with Tailwind and Autoprefixer.

#### [MODIFY] [vite.config.ts](file:///d:/Development/TAURI/Code%20Lite/vite.config.ts)
- Add `@vitejs/plugin-react` plugin.

#### [MODIFY] [src/styles.css](file:///d:/Development/TAURI/Code%20Lite/src/styles.css)
- Implement base Tailwind directives, custom scrollbars, xterm container styles, and Monaco editor theme styling.

---

### Phase 2: Rust Backend Services & Tauri Commands (`src-tauri`)

Implement modular Rust services separated into `commands/`, `services/`, and state models.

#### [MODIFY] [src-tauri/Cargo.toml](file:///d:/Development/TAURI/Code%20Lite/src-tauri/Cargo.toml)
- Add dependencies:
  - `portable-pty = "0.8"` (cross-platform pseudo-terminal for Windows ConPTY and Unix)
  - `walkdir = "2.5"` (fast directory traversal)
  - `regex = "1.10"` (pattern search)
  - `tokio = { version = "1", features = ["full"] }` (async runtime for streaming events)
  - `notify = "6.1"` (optional filesystem watcher)

#### [NEW] [src-tauri/src/services/fs_service.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/services/fs_service.rs)
- High-performance directory tree scanning, recursive file reading, safe atomic file writing, and path normalization.

#### [NEW] [src-tauri/src/services/search_service.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/services/search_service.rs)
- Fast workspace text search (ripgrep equivalent in Rust) with regex support, case-matching, file inclusions/exclusions, line numbers, and snippets.

#### [NEW] [src-tauri/src/services/pty_service.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/services/pty_service.rs)
- PTY session manager maintaining a thread-safe registry of active shell sessions (`portable_pty::PtyPair`).
- Spawns default shell on Windows (`powershell.exe` / `cmd.exe`) and reads output asynchronously, emitting Tauri events `terminal-output-{id}`.

#### [NEW] [src-tauri/src/commands/fs_commands.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/commands/fs_commands.rs)
- Expose Tauri commands:
  - `open_workspace_dialog`
  - `read_dir_tree(path, depth)`
  - `read_file_content(path, start_line, end_line)`
  - `write_file_content(path, content)`
  - `create_file_or_folder(path, is_dir)`

#### [NEW] [src-tauri/src/commands/search_commands.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/commands/search_commands.rs)
- Expose `search_in_workspace(query, is_regex, case_sensitive, includes)` command.

#### [NEW] [src-tauri/src/commands/terminal_commands.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/commands/terminal_commands.rs)
- Expose PTY lifecycle commands:
  - `spawn_terminal(id, cwd, cols, rows)`
  - `write_terminal(id, data)`
  - `resize_terminal(id, cols, rows)`
  - `kill_terminal(id)`

#### [MODIFY] [src-tauri/src/lib.rs](file:///d:/Development/TAURI/Code%20Lite/src-tauri/src/lib.rs)
- Register all command handlers and initialize `PtyServiceState`.

---

### Phase 3: Application State Management (Zustand Stores)

Create modular, dedicated state stores adhering to single-responsibility principles.

#### [NEW] [src/store/workspaceStore.ts](file:///d:/Development/TAURI/Code%20Lite/src/store/workspaceStore.ts)
- Workspace root path, file tree cache, expanded folders, active file selection.

#### [NEW] [src/store/editorStore.ts](file:///d:/Development/TAURI/Code%20Lite/src/store/editorStore.ts)
- Open tabs (`id`, `filePath`, `title`, `isDirty`, `content`, `originalContent`, `diffMode`), active tab ID, cursor position, editor settings.

#### [NEW] [src/store/terminalStore.ts](file:///d:/Development/TAURI/Code%20Lite/src/store/terminalStore.ts)
- Active terminal instances, current active terminal tab ("Terminal 1", "Agent Terminal"), visibility state.

#### [NEW] [src/store/agentStore.ts](file:///d:/Development/TAURI/Code%20Lite/src/store/agentStore.ts)
- Chat messages, tool execution queue, agent running status, pending diffs for review, auto-apply toggle, current step reasoning.

#### [NEW] [src/store/settingsStore.ts](file:///d:/Development/TAURI/Code%20Lite/src/store/settingsStore.ts)
- LLM provider configurations (OpenAI-compatible, Anthropic, Gemini, Ollama), API keys, selected models, theme (dark/light).

---

### Phase 4: Coding Agent Engine (OpenCode + Continue Hybrid)

Build the autonomous tool-calling engine in TypeScript with clean multi-provider abstractions.

#### [NEW] [src/services/agent/types.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/types.ts)
- Type definitions: `AgentMessage`, `ToolDefinition`, `ToolCallRequest`, `ToolExecutionResult`, `AgentEvent`, `ProviderConfig`.

#### [NEW] [src/services/agent/providers/openaiCompatible.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/providers/openaiCompatible.ts)
- Streaming completions with SSE parser and tool calling support for Ollama, LM Studio, OpenRouter, DeepSeek, and OpenAI.

#### [NEW] [src/services/agent/providers/anthropic.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/providers/anthropic.ts)
- Claude Messages API streaming client with tool_use blocks.

#### [NEW] [src/services/agent/providers/gemini.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/providers/gemini.ts)
- Gemini REST streaming client with functionDeclarations and functionCalls.

#### [NEW] [src/services/agent/tools/registry.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/tools/registry.ts)
- Tool definitions and dispatchers:
  - `read_file`: reads file lines via Rust command
  - `edit_file`: applies diff / replaces content, stages in editor for Monaco diff review
  - `write_file`: creates or writes whole file
  - `list_dir`: inspects directory structure
  - `grep_search`: searches codebase with ripgrep
  - `run_terminal_command`: executes command in Agent Terminal with streaming output

#### [NEW] [src/services/agent/engine.ts](file:///d:/Development/TAURI/Code%20Lite/src/services/agent/engine.ts)
- Autonomous reasoning loop:
  - Formats system instructions with workspace structure and active editor context
  - Calls LLM with tool schemas
  - Processes streaming reasoning tokens and tool invocations
  - Dispatches tools, passes results back to LLM context, and loops until completion or user approval requested

---

### Phase 5: Modular UI Components

Construct the UI following VS Code's layout and the user's design rules.

#### [NEW] [src/components/layout/TitleBar.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/layout/TitleBar.tsx)
- Custom draggable window bar, current workspace name, layout toggle buttons, and window controls using `VscChromeMinimize`, `VscChromeMaximize`, `VscChromeRestore`, `VscChromeClose`.

#### [NEW] [src/components/layout/ActivityBar.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/layout/ActivityBar.tsx)
- Left activity icons: Explorer (`VscFiles`), Search (`VscSearch`), Terminal toggle (`VscTerminal`), Settings (`VscSettingsGear`), Agent toggle (`VscSparkle` / `VscHubot`).

#### [NEW] [src/components/explorer/ExplorerSidebar.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/explorer/ExplorerSidebar.tsx)
- Workspace folder open button, recursive file tree, file creation/rename icons.

#### [NEW] [src/components/search/SearchSidebar.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/search/SearchSidebar.tsx)
- Global search input, regex/case match toggles, match list grouped by file with quick navigation.

#### [NEW] [src/components/editor/EditorContainer.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/editor/EditorContainer.tsx)
- Tab bar (`EditorTabs.tsx`), Monaco Editor (`MonacoEditor.tsx`), Monaco Diff Editor (`MonacoDiffEditor.tsx`) with Accept/Reject banner when agent proposes edits.

#### [NEW] [src/components/terminal/TerminalContainer.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/terminal/TerminalContainer.tsx)
- Bottom resizable panel with tabs ("User Terminal", "Agent Output"), xterm.js instance with `@xterm/addon-fit`.

#### [NEW] [src/components/agent/AgentPanel.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/agent/AgentPanel.tsx)
- Right collapsible panel:
  - Header with model selector, clear chat, auto-apply toggle
  - Message thread showing user prompts, assistant thoughts, tool call cards (with status badges, tool inputs, and collapsible outputs)
  - Pending diff review banner (links directly to active Monaco Diff tab)
  - Prompt input with `@file` mention autocomplete and send/stop buttons

#### [NEW] [src/components/settings/SettingsModal.tsx](file:///d:/Development/TAURI/Code%20Lite/src/components/settings/SettingsModal.tsx)
- Modal to configure provider endpoints, API keys (Ollama URL `http://localhost:11434`, OpenAI, Anthropic, Gemini, OpenRouter), and default model names.

#### [MODIFY] [src/App.tsx](file:///d:/Development/TAURI/Code%20Lite/src/App.tsx)
- Main application shell integrating TitleBar, ActivityBar, Sidebar, EditorContainer, TerminalContainer, AgentPanel, and SettingsModal.

---

## Verification Plan

### Automated Build & Typecheck Verification
- Run `npm run build` to verify that all TypeScript types, React components, and Vite bundles build cleanly with zero errors.

### Manual Verification
1. **Window Controls & Shell**: Verify title bar drag, minimize, maximize, and close buttons (`VscChrome*`).
2. **File Explorer**: Open a folder (e.g. current project), expand/collapse directories, open files into editor tabs.
3. **Monaco Editor**: Verify syntax highlighting, theme matching, editing, tab switching, and dirty state indicators.
4. **Search**: Search for strings across the workspace with instant ripgrep results and click-to-navigate to lines.
5. **Integrated Terminal**: Launch PowerShell terminal, run commands (`dir`, `echo "hello"`), verify xterm.js rendering and resizing.
6. **Agent Loop & Tools**:
   - Configure Ollama or API key in Settings.
   - Prompt agent: e.g. "Find where the greeting command is defined and explain it." -> Agent uses `grep_search` and `read_file`.
   - Prompt agent: "Add a new helper function in a file." -> Agent calls `edit_file`, opens Monaco Diff Editor, and offers Accept/Reject buttons.
   - Run command tool: Verify output streams to the Agent Terminal tab.

import React, { useState, useRef, useEffect } from "react";
import {
  VscAdd,
  VscClose,
  VscSend,
  VscDebugStop,
  VscDiff,
  VscSettingsGear,
  VscHistory,
  VscCheck,
  VscEdit,
  VscFolder,
} from "react-icons/vsc";
import { useAgentStore } from "../../store/agentStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useEditorStore } from "../../store/editorStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLayoutStore } from "../../store/layoutStore";
import { runAgentLoop, stopAgent } from "../../services/agent/engine";
import { AgentMessageItem } from "./AgentMessageItem";
import { AgentHistoryDrawer } from "./AgentHistoryDrawer";
import { ContextMentionMenu, MentionItem } from "./ContextMentionMenu";
import { SlashCommandMenu, SlashCommandItem } from "./SlashCommandMenu";

export const AgentPanel: React.FC = () => {
  const {
    isPanelOpen,
    togglePanel,
    messages,
    isRunning,
    autoApply,
    setAutoApply,
    agentMode,
    setAgentMode,
    currentSessionTitle,
    currentSessionId,
    renameSession,
    createNewSession,
    toggleHistoryDrawer,
    isHistoryDrawerOpen,
    workspaceSessions,
    loadWorkspaceSessions,
    pendingDiffs,
  } = useAgentStore();

  const { activeProvider, providers, setModalOpen } = useSettingsStore();
  const { tabs, activeTabId, openDiffTab } = useEditorStore();
  const { workspacePath } = useWorkspaceStore();
  const { agentWidth, setAgentWidth } = useLayoutStore();

  const [inputPrompt, setInputPrompt] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sessionTitleInput, setSessionTitleInput] = useState(currentSessionTitle);

  // Autocomplete context / slash menus
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const startXRef = useRef(0);
  const startWidthRef = useRef(agentWidth);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeModel = providers[activeProvider]?.model || "unknown";
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load workspace history on mount & workspace change
  useEffect(() => {
    if (workspacePath) {
      loadWorkspaceSessions(workspacePath);
    }
  }, [workspacePath, loadWorkspaceSessions]);

  useEffect(() => {
    setSessionTitleInput(currentSessionTitle);
  }, [currentSessionTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isPanelOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = agentWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startXRef.current - moveEvent.clientX;
      setAgentWidth(startWidthRef.current + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputPrompt(val);

    // Check for slash commands at the start of input
    if (val.startsWith("/")) {
      const commandPart = val.split(" ")[0];
      setSlashQuery(commandPart);
      setMentionQuery(null);
    } else {
      setSlashQuery(null);

      // Check for @ mentions at cursor or end
      const lastAtIndex = val.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const afterAt = val.slice(lastAtIndex);
        if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
          setMentionQuery(afterAt);
        } else {
          setMentionQuery(null);
        }
      } else {
        setMentionQuery(null);
      }
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleMentionSelect = (item: MentionItem) => {
    if (!mentionQuery) return;
    const lastAtIndex = inputPrompt.lastIndexOf(mentionQuery);
    if (lastAtIndex !== -1) {
      const nextText =
        inputPrompt.slice(0, lastAtIndex) + item.insertText + " " + inputPrompt.slice(lastAtIndex + mentionQuery.length);
      setInputPrompt(nextText);
    }
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleSlashSelect = (item: SlashCommandItem) => {
    if (item.id === "clear") {
      useAgentStore.getState().clearChat();
      setInputPrompt("");
    } else if (item.id === "diff") {
      const diff = pendingDiffs[0];
      if (diff) {
        openDiffTab(diff.filePath, diff.originalContent, diff.proposedContent);
      }
      setInputPrompt("");
    } else {
      setInputPrompt(item.actionPrompt || `${item.command} `);
    }
    setSlashQuery(null);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isRunning) return;

    const promptToSend = inputPrompt.trim();
    setInputPrompt("");
    setMentionQuery(null);
    setSlashQuery(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    runAgentLoop(promptToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery || slashQuery) {
      // Let mention or slash menu handle ArrowUp/Down/Enter
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertContextPill = (text: string) => {
    setInputPrompt((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSessionId && sessionTitleInput.trim()) {
      renameSession(currentSessionId, sessionTitleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const activePendingDiff = pendingDiffs.find((d) => d.status === "pending");

  return (
    <aside
      style={{ width: `${agentWidth}px` }}
      className="h-full bg-vsc-sidebar flex flex-col border-l border-vsc-border z-30 select-none text-xs flex-shrink-0 relative"
    >
      {/* Left Resize Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 h-full absolute top-0 -left-0.5 cursor-col-resize hover:bg-blue-500 z-40 transition-colors ${
          isResizing ? "bg-blue-500" : "bg-transparent"
        }`}
      />

      {/* Slide-out Workspace History Drawer */}
      <AgentHistoryDrawer />

      {/* Top Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-vsc-border bg-vsc-activity flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* History Drawer Toggle Button */}
          <button
            onClick={toggleHistoryDrawer}
            title={`Workspace Chat History (${workspaceSessions.length} sessions)`}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
              isHistoryDrawerOpen
                ? "bg-blue-600 text-white"
                : "hover:bg-vsc-hover text-gray-400 hover:text-white"
            }`}
          >
            <VscHistory className="text-sm" />
          </button>

          {/* New Chat Button */}
          <button
            onClick={() => createNewSession()}
            title="Start New Conversation"
            className="p-1.5 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
          >
            <VscAdd className="text-sm" />
          </button>

          {/* Session Title (Editable) */}
          <div className="min-w-0 flex-1 ml-1">
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={sessionTitleInput}
                  onChange={(e) => setSessionTitleInput(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  className="w-full bg-vsc-bg border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                />
                <button type="submit" className="text-green-400">
                  <VscCheck />
                </button>
              </form>
            ) : (
              <div
                onDoubleClick={() => setIsEditingTitle(true)}
                title="Double-click to rename conversation"
                className="font-semibold text-gray-200 text-xs truncate cursor-pointer hover:text-white flex items-center gap-1 group"
              >
                <span className="truncate">{currentSessionTitle}</span>
                <VscEdit className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mode Pill Toggle (Agent vs Planning) */}
          <div className="flex items-center bg-vsc-bg rounded p-0.5 border border-vsc-border text-[10px]">
            <button
              onClick={() => setAgentMode("agent")}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                agentMode === "agent"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Agent Mode: Autonomous multi-step tool execution"
            >
              Agent
            </button>
            <button
              onClick={() => setAgentMode("planning")}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                agentMode === "planning"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Planning Mode: Interview & generate implementation plan first"
            >
              Plan
            </button>
          </div>

          {/* LLM Settings Gear Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
            title={`LLM Settings (${activeProvider} - ${activeModel})`}
          >
            <VscSettingsGear className="text-sm" />
          </button>

          {/* Close Panel */}
          <button
            onClick={togglePanel}
            title="Close Panel"
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white"
          >
            <VscClose className="text-sm" />
          </button>
        </div>
      </div>

      {/* Pending Diff Alert Banner */}
      {activePendingDiff && (
        <div
          onClick={() =>
            openDiffTab(
              activePendingDiff.filePath,
              activePendingDiff.originalContent,
              activePendingDiff.proposedContent
            )
          }
          className="bg-amber-500/10 border-b border-amber-500/30 p-2 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
            <VscDiff className="text-amber-400" />
            <span className="font-medium">Diff ready for review: {activePendingDiff.filePath.split(/[/\\]/).pop()}</span>
          </div>
          <span className="text-[10px] underline text-amber-400 font-medium">Review Diff</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-vsc-border/30">
        {messages.map((message) => (
          <AgentMessageItem key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Quick Pills */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-vsc-border/60 bg-vsc-bg/60 flex-wrap flex-shrink-0">
        <span className="text-[10px] text-gray-500">Context:</span>
        {activeTab && !activeTab.diffMode && (
          <button
            onClick={() => insertContextPill(`@${activeTab.title}`)}
            className="px-1.5 py-0.5 rounded bg-vsc-hover hover:bg-vsc-selected text-[10px] text-blue-300 transition-colors truncate max-w-[130px]"
            title={activeTab.filePath}
          >
            @{activeTab.title}
          </button>
        )}
        <button
          onClick={() => insertContextPill("@workspace")}
          className="px-1.5 py-0.5 rounded bg-vsc-hover hover:bg-vsc-selected text-[10px] text-gray-300 transition-colors flex items-center gap-1"
        >
          <VscFolder className="text-blue-400 text-[10px]" />
          <span>@workspace</span>
        </button>
        <button
          onClick={() => insertContextPill("@terminal")}
          className="px-1.5 py-0.5 rounded bg-vsc-hover hover:bg-vsc-selected text-[10px] text-gray-300 transition-colors"
        >
          @terminal
        </button>
        <button
          onClick={() => insertContextPill("@knowledge")}
          className="px-1.5 py-0.5 rounded bg-vsc-hover hover:bg-vsc-selected text-[10px] text-purple-300 transition-colors"
        >
          @knowledge
        </button>

        {/* Auto Apply Toggle on right */}
        <label
          title="Auto-apply file edits without manual confirmation"
          className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-gray-200"
        >
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => setAutoApply(e.target.checked)}
            className="rounded bg-vsc-bg border-vsc-border text-blue-600 focus:ring-0 cursor-pointer text-xs"
          />
          <span>Auto-apply</span>
        </label>
      </div>

      {/* Input Prompt Box with Mention and Slash Menus */}
      <div className="p-3 border-t border-vsc-border bg-vsc-activity/40 relative flex-shrink-0">
        {/* Floating @ Mention Menu */}
        {mentionQuery !== null && (
          <ContextMentionMenu
            filterText={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionQuery(null)}
          />
        )}

        {/* Floating / Slash Command Menu */}
        {slashQuery !== null && (
          <SlashCommandMenu
            filterText={slashQuery}
            onSelect={handleSlashSelect}
            onClose={() => setSlashQuery(null)}
          />
        )}

        <div className="relative border border-vsc-border rounded-lg bg-vsc-bg focus-within:border-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder={
              agentMode === "planning"
                ? "Describe what you want to build (Planning mode active)... Type '/' for commands or '@' for context"
                : "Ask agent or type '/' for commands, '@' to mention context..."
            }
            value={inputPrompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent p-2.5 text-xs text-white placeholder-gray-500 outline-none resize-none font-sans"
          />

          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[10px] text-gray-500">
              Type <kbd className="font-mono text-gray-400">/</kbd> commands, <kbd className="font-mono text-gray-400">@</kbd> context
            </span>

            {isRunning ? (
              <button
                onClick={stopAgent}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1 text-[11px] transition-colors shadow-sm"
              >
                <VscDebugStop />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={!inputPrompt.trim()}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium flex items-center gap-1 text-[11px] transition-colors shadow-sm"
              >
                <VscSend />
                <span>Send</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

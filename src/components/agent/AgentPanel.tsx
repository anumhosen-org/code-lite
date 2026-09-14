import React, { useState, useRef, useEffect } from "react";
import {
  VscSparkle,
  VscClearAll,
  VscClose,
  VscSend,
  VscDebugStop,
  VscDiff,
  VscSettingsGear,
} from "react-icons/vsc";
import { useAgentStore } from "../../store/agentStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useEditorStore } from "../../store/editorStore";
import { useLayoutStore } from "../../store/layoutStore";
import { runAgentLoop, stopAgent } from "../../services/agent/engine";
import { AgentMessageItem } from "./AgentMessageItem";

export const AgentPanel: React.FC = () => {
  const {
    isPanelOpen,
    togglePanel,
    messages,
    isRunning,
    autoApply,
    setAutoApply,
    clearChat,
    pendingDiffs,
  } = useAgentStore();
  const { activeProvider, providers, setModalOpen } = useSettingsStore();
  const { tabs, activeTabId, openDiffTab } = useEditorStore();
  const { agentWidth, setAgentWidth } = useLayoutStore();

  const [inputPrompt, setInputPrompt] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(agentWidth);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeModel = providers[activeProvider]?.model || "unknown";
  const activeTab = tabs.find((t) => t.id === activeTabId);

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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isRunning) return;

    const promptToSend = inputPrompt.trim();
    setInputPrompt("");
    runAgentLoop(promptToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertContextPill = (text: string) => {
    setInputPrompt((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
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

      {/* Top Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-vsc-border bg-vsc-activity">
        <div className="flex items-center gap-2">
          <VscSparkle className="text-blue-400 text-sm" />
          <span className="font-semibold text-gray-200 text-xs">AGENT</span>
          <button
            onClick={() => setModalOpen(true)}
            className="text-[10px] bg-vsc-hover px-1.5 py-0.5 rounded text-gray-400 hover:text-white flex items-center gap-1 font-mono truncate max-w-[120px]"
            title={`Active: ${activeProvider} (${activeModel})`}
          >
            <span className="truncate">{activeModel}</span>
            <VscSettingsGear className="text-[10px] flex-shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Auto Apply Toggle */}
          <label
            title="Auto-apply file edits without diff prompt"
            className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer mr-1.5 hover:text-gray-200"
          >
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              className="rounded bg-vsc-bg border-vsc-border text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Auto-apply</span>
          </label>

          <button
            onClick={clearChat}
            title="Clear Chat History"
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white"
          >
            <VscClearAll className="text-sm" />
          </button>

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
          className="bg-amber-500/10 border-b border-amber-500/30 p-2 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
            <VscDiff className="text-amber-400" />
            <span className="font-medium">Diff ready for review</span>
          </div>
          <span className="text-[10px] underline text-amber-400">Review</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-vsc-border/40">
        {messages.map((message) => (
          <AgentMessageItem key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Quick Pills */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-vsc-border/60 bg-vsc-bg/50">
        <span className="text-[10px] text-gray-500">Attach:</span>
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
          className="px-1.5 py-0.5 rounded bg-vsc-hover hover:bg-vsc-selected text-[10px] text-gray-300 transition-colors"
        >
          @workspace
        </button>
      </div>

      {/* Input Prompt Box */}
      <div className="p-3 border-t border-vsc-border bg-vsc-activity/40">
        <div className="relative border border-vsc-border rounded-lg bg-vsc-bg focus-within:border-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="Ask agent, e.g. 'search for greeting logic and explain'..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent p-2.5 text-xs text-white placeholder-gray-500 outline-none resize-none font-sans"
          />

          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[10px] text-gray-500">
              Press <kbd className="font-mono">Enter</kbd> to send
            </span>

            {isRunning ? (
              <button
                onClick={stopAgent}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1 text-[11px] transition-colors"
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

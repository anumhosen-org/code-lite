import React from "react";
import { VscCode, VscSparkle, VscTerminal } from "react-icons/vsc";
import { useEditorStore } from "../../store/editorStore";
import { useTerminalStore } from "../../store/terminalStore";
import { useAgentStore } from "../../store/agentStore";
import { EditorTabs } from "./EditorTabs";
import { MonacoEditor } from "./MonacoEditor";
import { MonacoDiffEditor } from "./MonacoDiffEditor";

export const EditorContainer: React.FC = () => {
  const { tabs, activeTabId } = useEditorStore();
  const { toggleTerminal } = useTerminalStore();
  const { togglePanel } = useAgentStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-full flex-1 flex flex-col bg-vsc-editor overflow-hidden">
      {/* Tab bar */}
      <EditorTabs />

      {/* Editor Content Area */}
      <div className="flex-1 w-full overflow-hidden relative">
        {activeTab ? (
          activeTab.diffMode ? (
            <MonacoDiffEditor key={activeTab.id} tab={activeTab} />
          ) : (
            <MonacoEditor key={activeTab.id} tab={activeTab} />
          )
        ) : (
          /* Empty Workspace Splash */
          <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 select-none">
            <div className="w-16 h-16 rounded-2xl bg-vsc-activity flex items-center justify-center mb-4 border border-vsc-border/60">
              <VscCode className="text-4xl text-blue-500/80" />
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-1">Code Lite</h2>
            <p className="text-xs text-gray-400 mb-6">
              High-performance agentic code editor
            </p>

            <div className="flex flex-col gap-2.5 text-xs text-gray-400 max-w-sm w-full">
              <div
                onClick={togglePanel}
                className="flex items-center justify-between p-2.5 rounded bg-vsc-sidebar hover:bg-vsc-hover cursor-pointer border border-vsc-border/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <VscSparkle className="text-blue-400" />
                  <span className="text-gray-300">Ask Coding Agent</span>
                </div>
                <kbd className="px-2 py-0.5 bg-vsc-bg rounded text-[11px] font-mono border border-vsc-border text-gray-400">
                  Ctrl+L
                </kbd>
              </div>

              <div
                onClick={toggleTerminal}
                className="flex items-center justify-between p-2.5 rounded bg-vsc-sidebar hover:bg-vsc-hover cursor-pointer border border-vsc-border/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <VscTerminal className="text-green-400" />
                  <span className="text-gray-300">Open Terminal</span>
                </div>
                <kbd className="px-2 py-0.5 bg-vsc-bg rounded text-[11px] font-mono border border-vsc-border text-gray-400">
                  Ctrl+`
                </kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

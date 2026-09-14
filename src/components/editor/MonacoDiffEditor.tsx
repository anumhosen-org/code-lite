import React, { useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { VscCheck, VscClose, VscSplitHorizontal } from "react-icons/vsc";
import { EditorTab } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { useAgentStore } from "../../store/agentStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { fsService } from "../../services/tauri/fs";

interface MonacoDiffEditorProps {
  tab: EditorTab;
}

export const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({ tab }) => {
  const { closeTab, openFile } = useEditorStore();
  const { pendingDiffs, resolvePendingDiff } = useAgentStore();
  const refreshTree = useWorkspaceStore((s) => s.refreshTree);
  const [inlineView, setInlineView] = useState(false);

  const matchedDiff = pendingDiffs.find((d) => d.filePath === tab.filePath);

  const handleAccept = async () => {
    try {
      await fsService.writeFileContent(tab.filePath, tab.content);
      if (matchedDiff) {
        resolvePendingDiff(matchedDiff.id, "accepted");
      }
      await refreshTree();
      closeTab(tab.id);
      openFile(tab.filePath);
    } catch (err) {
      console.error("Failed to accept diff:", err);
    }
  };

  const handleReject = () => {
    if (matchedDiff) {
      resolvePendingDiff(matchedDiff.id, "rejected");
    }
    closeTab(tab.id);
  };

  return (
    <div className="h-full w-full flex flex-col bg-vsc-editor overflow-hidden">
      {/* Diff Review Action Banner */}
      <div className="h-10 bg-amber-950/40 border-b border-amber-600/30 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-amber-300">Agent Proposed Modifications</span>
          <span className="text-gray-400 truncate max-w-md">({tab.filePath})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInlineView(!inlineView)}
            title="Toggle Inline / Side-by-Side Diff"
            className="px-2 py-1 bg-vsc-hover hover:bg-vsc-selected text-xs text-gray-200 rounded flex items-center gap-1 transition-colors"
          >
            <VscSplitHorizontal />
            <span>{inlineView ? "Side-by-Side" : "Inline"}</span>
          </button>

          <button
            onClick={handleReject}
            className="px-2.5 py-1 bg-red-800/60 hover:bg-red-700 text-xs text-red-200 rounded flex items-center gap-1 font-medium transition-colors"
          >
            <VscClose />
            <span>Reject</span>
          </button>

          <button
            onClick={handleAccept}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-xs text-white rounded flex items-center gap-1 font-medium transition-colors shadow-sm"
          >
            <VscCheck />
            <span>Accept Changes</span>
          </button>
        </div>
      </div>

      {/* Monaco Diff Viewer */}
      <div className="flex-1 w-full overflow-hidden">
        <DiffEditor
          height="100%"
          theme="vs-dark"
          original={tab.originalContent || ""}
          modified={tab.content}
          language={tab.language}
          options={{
            renderSideBySide: !inlineView,
            readOnly: true,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};

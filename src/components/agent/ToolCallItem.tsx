import React, { useState } from "react";
import {
  VscTools,
  VscChevronDown,
  VscChevronRight,
  VscCheck,
  VscLoading,
  VscError,
  VscFileCode,
  VscSearch,
  VscTerminal,
  VscEdit,
  VscCopy,
  VscBook,
  VscDatabase,
  VscDiff,
} from "react-icons/vsc";
import { ToolCallItem as ToolCallItemType, useAgentStore } from "../../store/agentStore";
import { useEditorStore } from "../../store/editorStore";

interface ToolCallItemProps {
  tool: ToolCallItemType;
}

function getToolIcon(name: string) {
  switch (name) {
    case "read_file":
    case "list_dir":
      return <VscFileCode className="text-blue-400" />;
    case "grep_search":
      return <VscSearch className="text-purple-400" />;
    case "edit_file":
    case "write_file":
      return <VscEdit className="text-amber-400" />;
    case "run_terminal_command":
      return <VscTerminal className="text-green-400" />;
    case "lookup_tauri_knowledge":
      return <VscBook className="text-emerald-400" />;
    case "semantic_code_search":
      return <VscDatabase className="text-cyan-400" />;
    default:
      return <VscTools className="text-gray-400" />;
  }
}

export const ToolCallItem: React.FC<ToolCallItemProps> = ({ tool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { pendingDiffs } = useAgentStore();
  const { openDiffTab } = useEditorStore();

  const relatedDiff = pendingDiffs.find((d) => d.toolCallId === tool.id || (tool.args?.path && d.filePath === tool.args.path));

  const handleCopyOutput = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool.output) {
      navigator.clipboard.writeText(tool.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const statusBadge = () => {
    switch (tool.status) {
      case "running":
        return (
          <span className="flex items-center gap-1 text-[10px] text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded">
            <VscLoading className="animate-spin" />
            <span>Running</span>
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <VscCheck />
            <span>Done</span>
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium bg-red-500/10 px-1.5 py-0.5 rounded">
            <VscError />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] text-gray-400 bg-gray-500/10 px-1.5 py-0.5 rounded">
            Queued
          </span>
        );
    }
  };

  const argsDisplay = tool.args
    ? Object.entries(tool.args)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v.slice(0, 35)}"` : JSON.stringify(v)}`)
        .join(", ")
    : "";

  return (
    <div className="my-1.5 border border-vsc-border/80 bg-vsc-activity/50 rounded-lg overflow-hidden text-xs">
      {/* Tool Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-vsc-hover transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 text-xs">
            {isOpen ? <VscChevronDown /> : <VscChevronRight />}
          </span>
          {getToolIcon(tool.name)}
          <span className="font-semibold text-gray-200 text-[11px] font-mono">
            {tool.name}
          </span>
          <span className="text-gray-400 text-[10px] truncate max-w-[130px] font-mono">
            ({argsDisplay})
          </span>
        </div>
        <div>{statusBadge()}</div>
      </div>

      {/* Action preview banner if file diff available */}
      {relatedDiff && (
        <div className="px-2.5 py-1 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-between text-[10px]">
          <span className="text-amber-300 truncate max-w-[200px]">
            Changes proposed for {relatedDiff.filePath.split(/[/\\]/).pop()}
          </span>
          <button
            onClick={() =>
              openDiffTab(
                relatedDiff.filePath,
                relatedDiff.originalContent,
                relatedDiff.proposedContent
              )
            }
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
          >
            <VscDiff />
            <span>Review Diff</span>
          </button>
        </div>
      )}

      {/* Expanded Details */}
      {isOpen && (
        <div className="p-2 border-t border-vsc-border/60 bg-vsc-bg font-mono text-[11px] text-gray-300 space-y-2">
          <div>
            <div className="text-gray-400 text-[10px] mb-1 font-sans font-semibold">
              ARGUMENTS:
            </div>
            <pre className="p-2 bg-vsc-sidebar rounded text-[10px] overflow-x-auto text-blue-300">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {tool.output && (
            <div>
              <div className="flex items-center justify-between text-gray-400 text-[10px] mb-1 font-sans font-semibold">
                <span>OUTPUT:</span>
                <button
                  onClick={handleCopyOutput}
                  className="flex items-center gap-1 text-[10px] hover:text-white transition-colors"
                >
                  <VscCopy />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-2 bg-vsc-sidebar rounded text-[10px] overflow-x-auto max-h-48 text-gray-300 whitespace-pre-wrap leading-relaxed">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

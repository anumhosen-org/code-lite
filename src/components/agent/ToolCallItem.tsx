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
} from "react-icons/vsc";
import { ToolCallItem as ToolCallItemType } from "../../store/agentStore";

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
    default:
      return <VscTools className="text-gray-400" />;
  }
}

export const ToolCallItem: React.FC<ToolCallItemProps> = ({ tool }) => {
  const [isOpen, setIsOpen] = useState(false);

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
        .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v.slice(0, 40)}"` : JSON.stringify(v)}`)
        .join(", ")
    : "";

  return (
    <div className="my-1.5 border border-vsc-border/80 bg-vsc-activity/50 rounded overflow-hidden text-xs">
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
          <span className="text-gray-400 text-[10px] truncate max-w-[140px] font-mono">
            ({argsDisplay})
          </span>
        </div>
        <div>{statusBadge()}</div>
      </div>

      {/* Expanded Details */}
      {isOpen && (
        <div className="p-2 border-t border-vsc-border/60 bg-vsc-bg font-mono text-[11px] text-gray-300">
          <div className="text-gray-400 text-[10px] mb-1 font-sans font-semibold">ARGUMENTS:</div>
          <pre className="p-1.5 bg-vsc-sidebar rounded text-[10px] overflow-x-auto text-blue-300 mb-2">
            {JSON.stringify(tool.args, null, 2)}
          </pre>

          {tool.output && (
            <>
              <div className="text-gray-400 text-[10px] mb-1 font-sans font-semibold">OUTPUT:</div>
              <pre className="p-1.5 bg-vsc-sidebar rounded text-[10px] overflow-x-auto max-h-48 text-gray-300 whitespace-pre-wrap">
                {tool.output}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};

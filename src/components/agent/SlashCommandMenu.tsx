import React, { useEffect, useRef } from "react";
import {
  VscTarget,
  VscFeedback,
  VscBook,
  VscDiff,
  VscClearAll,
  VscSparkle,
} from "react-icons/vsc";

export interface SlashCommandItem {
  id: string;
  command: string;
  description: string;
  icon: React.ReactNode;
  actionPrompt?: string;
}

interface SlashCommandMenuProps {
  filterText: string;
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "goal",
    command: "/goal",
    description: "Launch an autonomous long-running task that perseveres until the goal is fully achieved",
    icon: <VscTarget className="text-red-400" />,
    actionPrompt: "/goal ",
  },
  {
    id: "grill-me",
    command: "/grill-me",
    description: "Interview me to systematically align on plans and resolve architectural decisions",
    icon: <VscFeedback className="text-purple-400" />,
    actionPrompt: "/grill-me ",
  },
  {
    id: "learn",
    command: "/learn",
    description: "Persist an established coding pattern, fix, or rule into the offline SQLite knowledge base",
    icon: <VscSparkle className="text-yellow-400" />,
    actionPrompt: "/learn ",
  },
  {
    id: "diff",
    command: "/diff",
    description: "Open the visual diff editor to review proposed code changes",
    icon: <VscDiff className="text-blue-400" />,
    actionPrompt: "/diff",
  },
  {
    id: "knowledge",
    command: "/knowledge",
    description: "Search offline Tauri v2 architecture recipes, IPC handlers, and compiler playbooks",
    icon: <VscBook className="text-green-400" />,
    actionPrompt: "/knowledge ",
  },
  {
    id: "clear",
    command: "/clear",
    description: "Clear conversation history and start a fresh session",
    icon: <VscClearAll className="text-gray-400" />,
    actionPrompt: "/clear",
  },
];

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  filterText,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = filterText.toLowerCase().replace(/^\//, "");
  const filteredCommands = SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-3 right-3 mb-1 bg-vsc-sidebar border border-vsc-border rounded-lg shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in-50 duration-75"
    >
      <div className="px-3 py-1.5 border-b border-vsc-border/60 text-[10px] font-semibold text-gray-400 flex items-center justify-between bg-vsc-activity">
        <span>SLASH COMMANDS</span>
        <span className="text-gray-500 font-mono">Use ↑↓ and Enter</span>
      </div>

      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
        {filteredCommands.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                isSelected
                  ? "bg-vsc-hover text-white"
                  : "text-gray-300 hover:bg-vsc-hover/50 hover:text-white"
              }`}
            >
              <span className="text-sm flex-shrink-0">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[11px] font-mono">{item.command}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

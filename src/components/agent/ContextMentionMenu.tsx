import React, { useEffect, useRef } from "react";
import {
  VscFiles,
  VscFolder,
  VscTerminal,
  VscWarning,
  VscBook,
} from "react-icons/vsc";
import { useEditorStore } from "../../store/editorStore";

export interface MentionItem {
  id: string;
  label: string;
  insertText: string;
  description: string;
  icon: React.ReactNode;
}

interface ContextMentionMenuProps {
  filterText: string;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

export const ContextMentionMenu: React.FC<ContextMentionMenuProps> = ({
  filterText,
  onSelect,
  onClose,
}) => {
  const { tabs } = useEditorStore();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build context options: open files + special tokens
  const items: MentionItem[] = [
    {
      id: "workspace",
      label: "@workspace",
      insertText: "@workspace",
      description: "Active project workspace tree and root files",
      icon: <VscFolder className="text-blue-400" />,
    },
    {
      id: "terminal",
      label: "@terminal",
      insertText: "@terminal",
      description: "Active terminal console buffer and recent command output",
      icon: <VscTerminal className="text-green-400" />,
    },
    {
      id: "problems",
      label: "@problems",
      insertText: "@problems",
      description: "Compiler errors, warnings, and linter diagnostics",
      icon: <VscWarning className="text-yellow-400" />,
    },
    {
      id: "knowledge",
      label: "@knowledge",
      insertText: "@knowledge",
      description: "Offline Tauri architecture and compiler error playbooks",
      icon: <VscBook className="text-purple-400" />,
    },
    // Add open tabs
    ...tabs
      .filter((t) => !t.diffMode)
      .map((tab) => ({
        id: `tab-${tab.id}`,
        label: `@${tab.title}`,
        insertText: `@${tab.title}`,
        description: tab.filePath,
        icon: <VscFiles className="text-blue-300" />,
      })),
  ];

  const query = filterText.toLowerCase().replace(/^@/, "");
  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  if (filteredItems.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-3 right-3 mb-1 bg-vsc-sidebar border border-vsc-border rounded-lg shadow-2xl overflow-hidden z-50 text-xs animate-in fade-in-50 duration-75"
    >
      <div className="px-3 py-1.5 border-b border-vsc-border/60 text-[10px] font-semibold text-gray-400 flex items-center justify-between bg-vsc-activity">
        <span>ATTACH CONTEXT</span>
        <span className="text-gray-500 font-mono">Use ↑↓ and Enter</span>
      </div>

      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
        {filteredItems.map((item, idx) => {
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
                <div className="font-medium text-[11px] truncate">{item.label}</div>
                <div className="text-[10px] text-gray-500 truncate">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

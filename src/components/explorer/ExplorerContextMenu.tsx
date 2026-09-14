import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  VscNewFile,
  VscNewFolder,
  VscEdit,
  VscTrash,
  VscFolder,
  VscFolderOpened,
  VscCopy,
  VscTerminal,
  VscSparkle,
  VscRefresh,
} from "react-icons/vsc";
import { fsService } from "../../services/tauri/fs";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEditorStore } from "../../store/editorStore";
import { useAgentStore } from "../../store/agentStore";
import { useTerminalStore } from "../../store/terminalStore";

export interface ContextMenuTarget {
  path: string;
  name: string;
  is_dir: boolean;
  isEmptyArea?: boolean;
}

interface ExplorerContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onClose: () => void;
  onStartInlineRename: (path: string, currentName: string) => void;
  onRequestDelete: (path: string, name: string, is_dir: boolean) => void;
  onStartCreate: (parentPath: string, type: "file" | "folder") => void;
}

export const ExplorerContextMenu: React.FC<ExplorerContextMenuProps> = ({
  x,
  y,
  target,
  onClose,
  onStartInlineRename,
  onRequestDelete,
  onStartCreate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { workspacePath, refreshTree, openFolderDialog } = useWorkspaceStore();
  const { openFile } = useEditorStore();
  const { setIsPanelOpen, addMessage } = useAgentStore();
  const { addTerminal } = useTerminalStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Constrain coordinates within screen viewport
  const menuWidth = 220;
  const menuHeight = target.isEmptyArea ? 160 : target.is_dir ? 300 : 260;
  const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
    onClose();
  };

  const getRelativePath = (fullPath: string) => {
    if (!workspacePath) return fullPath;
    const normFull = fullPath.replace(/\\/g, "/");
    const normRoot = workspacePath.replace(/\\/g, "/");
    if (normFull.startsWith(normRoot)) {
      return normFull.substring(normRoot.length).replace(/^\//, "");
    }
    return fullPath;
  };

  const handleRevealInExplorer = async () => {
    try {
      await fsService.revealInExplorer(target.path);
    } catch (err) {
      console.error("Failed to reveal in explorer:", err);
    }
    onClose();
  };

  const handleOpenInTerminal = () => {
    addTerminal();
    onClose();
  };

  const handleAskAgent = () => {
    setIsPanelOpen(true);
    addMessage({
      role: "user",
      content: `Please review and inspect this file: ${target.path}`,
    });
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 99999,
      }}
      className="w-56 bg-vsc-sidebar border border-vsc-border rounded-md shadow-2xl py-1 text-xs text-vsc-text select-none backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-75"
    >
      {target.isEmptyArea ? (
        <>
          <button
            onClick={() => {
              onStartCreate(workspacePath, "file");
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscNewFile className="text-xs text-gray-400" />
            <span className="flex-1">New File...</span>
          </button>
          <button
            onClick={() => {
              onStartCreate(workspacePath, "folder");
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscNewFolder className="text-xs text-gray-400" />
            <span className="flex-1">New Folder...</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={() => {
              openFolderDialog();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscFolderOpened className="text-xs text-blue-400" />
            <span className="flex-1">Open Folder...</span>
          </button>
          <button
            onClick={() => {
              refreshTree();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscRefresh className="text-xs text-gray-400" />
            <span className="flex-1">Refresh Explorer</span>
          </button>
        </>
      ) : target.is_dir ? (
        <>
          <button
            onClick={() => {
              onStartCreate(target.path, "file");
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscNewFile className="text-xs text-gray-400" />
            <span className="flex-1">New File...</span>
          </button>
          <button
            onClick={() => {
              onStartCreate(target.path, "folder");
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscNewFolder className="text-xs text-gray-400" />
            <span className="flex-1">New Folder...</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={handleOpenInTerminal}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscTerminal className="text-xs text-sky-400" />
            <span className="flex-1">Open in Integrated Terminal</span>
          </button>
          <button
            onClick={handleRevealInExplorer}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscFolder className="text-xs text-amber-400" />
            <span className="flex-1">Reveal in File Explorer</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={() => {
              onStartInlineRename(target.path, target.name);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscEdit className="text-xs text-gray-400" />
            <span className="flex-1">Rename...</span>
            <span className="text-[10px] text-gray-500 font-mono">F2</span>
          </button>
          <button
            onClick={() => {
              onRequestDelete(target.path, target.name, true);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 text-left transition-colors text-[11px]"
          >
            <VscTrash className="text-xs" />
            <span className="flex-1">Delete...</span>
            <span className="text-[10px] text-red-300 font-mono">Del</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={() => copyToClipboard(target.path)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscCopy className="text-xs text-gray-400" />
            <span className="flex-1">Copy Path</span>
          </button>
          <button
            onClick={() => copyToClipboard(getRelativePath(target.path))}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscCopy className="text-xs text-gray-400" />
            <span className="flex-1">Copy Relative Path</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              openFile(target.path);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscFolderOpened className="text-xs text-blue-400" />
            <span className="flex-1">Open</span>
          </button>
          <button
            onClick={handleRevealInExplorer}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscFolder className="text-xs text-amber-400" />
            <span className="flex-1">Reveal in File Explorer</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={() => {
              onStartInlineRename(target.path, target.name);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscEdit className="text-xs text-gray-400" />
            <span className="flex-1">Rename...</span>
            <span className="text-[10px] text-gray-500 font-mono">F2</span>
          </button>
          <button
            onClick={() => {
              onRequestDelete(target.path, target.name, false);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 text-left transition-colors text-[11px]"
          >
            <VscTrash className="text-xs" />
            <span className="flex-1">Delete...</span>
            <span className="text-[10px] text-red-300 font-mono">Del</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={() => copyToClipboard(target.path)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscCopy className="text-xs text-gray-400" />
            <span className="flex-1">Copy Path</span>
          </button>
          <button
            onClick={() => copyToClipboard(getRelativePath(target.path))}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
          >
            <VscCopy className="text-xs text-gray-400" />
            <span className="flex-1">Copy Relative Path</span>
          </button>
          <div className="my-1 border-t border-vsc-border/60" />
          <button
            onClick={handleAskAgent}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-purple-300 hover:text-white text-left transition-colors text-[11px]"
          >
            <VscSparkle className="text-xs text-purple-400" />
            <span className="flex-1">Ask Agent About This File</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
};

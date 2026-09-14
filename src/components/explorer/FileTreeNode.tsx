import React, { useState, useEffect, useRef } from "react";
import {
  VscFolder,
  VscFolderOpened,
  VscFile,
  VscFileCode,
  VscJson,
  VscMarkdown,
  VscChevronRight,
  VscChevronDown,
  VscTerminal,
} from "react-icons/vsc";
import { FileEntry } from "../../types";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEditorStore } from "../../store/editorStore";

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  renamingPath: string | null;
  onCommitRename: (oldPath: string, newName: string) => Promise<void>;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

function getFileIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) {
    return <VscFileCode className="text-sky-400 text-sm flex-shrink-0" />;
  }
  if (lower === ".gitignore" || lower === ".gitattributes") {
    return <VscFile className="text-orange-400 text-sm flex-shrink-0" />;
  }
  if (lower.startsWith(".env")) {
    return <VscFile className="text-amber-400 text-sm flex-shrink-0" />;
  }

  const ext = lower.split(".").pop() || "";
  switch (ext) {
    case "ts":
    case "tsx":
      return <VscFileCode className="text-sky-400 text-sm flex-shrink-0" />;
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return <VscFileCode className="text-yellow-400 text-sm flex-shrink-0" />;
    case "rs":
      return <VscFileCode className="text-orange-400 text-sm flex-shrink-0" />;
    case "py":
      return <VscFileCode className="text-emerald-400 text-sm flex-shrink-0" />;
    case "html":
    case "htm":
      return <VscFileCode className="text-orange-500 text-sm flex-shrink-0" />;
    case "css":
    case "scss":
    case "sass":
    case "less":
      return <VscFileCode className="text-pink-400 text-sm flex-shrink-0" />;
    case "json":
      return <VscJson className="text-amber-300 text-sm flex-shrink-0" />;
    case "md":
    case "markdown":
    case "mdx":
      return <VscMarkdown className="text-blue-300 text-sm flex-shrink-0" />;
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "ico":
    case "webp":
      return <VscFile className="text-purple-400 text-sm flex-shrink-0" />;
    case "sh":
    case "bash":
    case "ps1":
    case "bat":
    case "cmd":
      return <VscTerminal className="text-green-400 text-sm flex-shrink-0" />;
    default:
      return <VscFile className="text-gray-400 text-sm flex-shrink-0" />;
  }
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  entry,
  depth,
  renamingPath,
  onCommitRename,
  onCancelRename,
  onContextMenu,
}) => {
  const { expandedPaths, toggleFolder, selectedPath, selectPath, lazyExpandFolder } =
    useWorkspaceStore();
  const { openFile, activeTabId, tabs } = useEditorStore();

  const isExpanded = expandedPaths.has(entry.path);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isSelected = selectedPath === entry.path || activeTab?.filePath === entry.path;
  const isRenaming = renamingPath === entry.path;

  const [renameValue, setRenameValue] = useState(entry.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(entry.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIdx = entry.name.lastIndexOf(".");
          if (dotIdx > 0 && !entry.is_dir) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 20);
    }
  }, [isRenaming, entry.name, entry.is_dir]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRenaming) return;
    selectPath(entry.path);
    if (entry.is_dir) {
      if (!entry.children || entry.children.length === 0) {
        lazyExpandFolder(entry.path);
      } else {
        toggleFolder(entry.path);
      }
    } else {
      openFile(entry.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (renameValue.trim() && renameValue.trim() !== entry.name) {
        onCommitRename(entry.path, renameValue.trim());
      } else {
        onCancelRename();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancelRename();
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          selectPath(entry.path);
          onContextMenu(e, entry);
        }}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`flex items-center gap-1.5 py-0.5 pr-2 cursor-pointer text-[12.5px] rounded-sm transition-colors select-none group ${
          isSelected
            ? "bg-vsc-selected text-white font-medium"
            : "hover:bg-vsc-hover text-gray-300 hover:text-white"
        }`}
      >
        {entry.is_dir ? (
          <>
            <span className="text-gray-400 text-xs w-3.5 flex justify-center flex-shrink-0">
              {isExpanded ? <VscChevronDown /> : <VscChevronRight />}
            </span>
            {isExpanded ? (
              <VscFolderOpened className="text-blue-400 text-sm flex-shrink-0" />
            ) : (
              <VscFolder className="text-blue-400 text-sm flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 flex-shrink-0" />
            {getFileIcon(entry.name)}
          </>
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (renameValue.trim() && renameValue.trim() !== entry.name) {
                onCommitRename(entry.path, renameValue.trim());
              } else {
                onCancelRename();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-vsc-bg border border-blue-500 rounded px-1 text-xs text-white outline-none w-full font-mono py-0.2"
          />
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
      </div>

      {/* Render children if directory and expanded */}
      {entry.is_dir && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              renamingPath={renamingPath}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

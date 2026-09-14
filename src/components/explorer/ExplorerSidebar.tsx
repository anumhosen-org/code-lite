import React, { useState } from "react";
import {
  VscNewFile,
  VscNewFolder,
  VscRefresh,
  VscFolderOpened,
  VscCollapseAll,
} from "react-icons/vsc";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { FileTreeNode } from "./FileTreeNode";
import { ExplorerContextMenu, ContextMenuTarget } from "./ExplorerContextMenu";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { FileEntry } from "../../types";

export const ExplorerSidebar: React.FC = () => {
  const {
    workspacePath,
    fileTree,
    refreshTree,
    isLoading,
    openFolderDialog,
    collapseAllFolders,
    renameItem,
    deleteItem,
    createItem,
  } = useWorkspaceStore();

  const [creationTarget, setCreationTarget] = useState<{
    parentPath: string;
    type: "file" | "folder";
  } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    name: string;
    is_dir: boolean;
  } | null>(null);

  const folderName = workspacePath ? workspacePath.split(/[/\\]/).pop() : "NO FOLDER OPEN";

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !creationTarget) return;

    try {
      const sep = creationTarget.parentPath.includes("/") ? "/" : "\\";
      const fullPath = `${creationTarget.parentPath}${sep}${newItemName.trim()}`;
      await createItem(fullPath, creationTarget.type === "folder");
      setCreationTarget(null);
      setNewItemName("");
    } catch (err) {
      console.error("Failed to create item:", err);
    }
  };

  const handleCommitRename = async (oldPath: string, newName: string) => {
    try {
      const sep = oldPath.includes("/") ? "/" : "\\";
      const lastSep = oldPath.lastIndexOf(sep);
      const parentDir = lastSep >= 0 ? oldPath.substring(0, lastSep) : "";
      const newPath = parentDir ? `${parentDir}${sep}${newName}` : newName;
      await renameItem(oldPath, newPath);
    } catch (err) {
      console.error("Failed to rename item:", err);
    } finally {
      setRenamingPath(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.path);
    } catch (err) {
      console.error("Failed to delete item:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: {
        path: entry.path,
        name: entry.name,
        is_dir: entry.is_dir,
      },
    });
  };

  const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: {
        path: workspacePath || "",
        name: folderName || "",
        is_dir: true,
        isEmptyArea: true,
      },
    });
  };

  return (
    <div
      className="h-full flex flex-col bg-vsc-sidebar text-vsc-text select-none text-xs"
      onContextMenu={handleEmptyAreaContextMenu}
    >
      {/* Explorer Top Header */}
      <div className="h-9 px-3 flex items-center justify-between font-semibold tracking-wider text-[11px] text-gray-400 border-b border-vsc-border flex-shrink-0">
        <span className="truncate mr-2">EXPLORER</span>
        <div className="flex items-center gap-0.5">
          {workspacePath && (
            <>
              <button
                onClick={() => {
                  setCreationTarget({ parentPath: workspacePath, type: "file" });
                  setNewItemName("");
                }}
                title="New File"
                className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
              >
                <VscNewFile className="text-sm" />
              </button>
              <button
                onClick={() => {
                  setCreationTarget({ parentPath: workspacePath, type: "folder" });
                  setNewItemName("");
                }}
                title="New Folder"
                className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
              >
                <VscNewFolder className="text-sm" />
              </button>
              <button
                onClick={collapseAllFolders}
                title="Collapse All Folders"
                className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
              >
                <VscCollapseAll className="text-sm" />
              </button>
              <button
                onClick={() => refreshTree()}
                title="Refresh Explorer"
                className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
              >
                <VscRefresh className={`text-sm ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Root Project Header */}
      {workspacePath ? (
        <div
          onClick={() => refreshTree()}
          className="px-3 py-1.5 flex items-center justify-between font-bold text-gray-300 bg-vsc-sidebar hover:bg-vsc-hover cursor-pointer border-b border-vsc-border/50 transition-colors group flex-shrink-0"
          title={workspacePath}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <VscFolderOpened className="text-blue-400 text-sm flex-shrink-0" />
            <span className="truncate text-xs tracking-wide">{folderName}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFolderDialog();
            }}
            title="Open Another Folder..."
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-vsc-selected text-gray-400 hover:text-white text-[10px] transition-opacity"
          >
            Change
          </button>
        </div>
      ) : null}

      {/* Inline item creation input */}
      {creationTarget && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-vsc-border bg-vsc-bg/40 flex-shrink-0">
          <div className="text-[10px] text-gray-400 mb-1">
            New {creationTarget.type} in <span className="font-mono text-gray-300">{creationTarget.parentPath.split(/[/\\]/).pop()}</span>:
          </div>
          <input
            autoFocus
            type="text"
            placeholder={creationTarget.type === "file" ? "filename.ts" : "folder_name"}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCreationTarget(null);
            }}
            onBlur={() => {
              if (!newItemName.trim()) setCreationTarget(null);
            }}
            className="w-full bg-vsc-bg border border-blue-500 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {workspacePath ? (
          fileTree ? (
            fileTree.children && fileTree.children.length > 0 ? (
              fileTree.children.map((child) => (
                <FileTreeNode
                  key={child.path}
                  entry={child}
                  depth={0}
                  renamingPath={renamingPath}
                  onCommitRename={handleCommitRename}
                  onCancelRename={() => setRenamingPath(null)}
                  onContextMenu={handleNodeContextMenu}
                />
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">Folder is empty</div>
            )
          ) : (
            <div className="p-4 text-center text-gray-500">
              {isLoading ? "Loading workspace..." : "No folder loaded"}
            </div>
          )
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-center h-full gap-3 text-gray-400">
            <VscFolderOpened className="text-4xl text-gray-600 mb-1" />
            <div className="text-xs font-medium text-gray-300">No Folder Open</div>
            <p className="text-[11px] text-gray-500 max-w-[180px] leading-relaxed">
              Open a directory to browse files, run tests, and use the coding agent.
            </p>
            <button
              onClick={openFolderDialog}
              className="mt-2 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
            >
              Open Folder...
            </button>
          </div>
        )}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ExplorerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onStartInlineRename={(path) => {
            setRenamingPath(path);
          }}
          onRequestDelete={(path, name, is_dir) => {
            setDeleteTarget({ path, name, is_dir });
          }}
          onStartCreate={(parentPath, type) => {
            setCreationTarget({ parentPath, type });
            setNewItemName("");
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          name={deleteTarget.name}
          path={deleteTarget.path}
          isDir={deleteTarget.is_dir}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

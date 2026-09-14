import React, { useEffect, useRef } from "react";
import { VscWarning, VscClose } from "react-icons/vsc";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  name: string;
  path: string;
  isDir: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  name,
  path,
  isDir,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-[1px] select-none">
      <div className="bg-vsc-sidebar border border-vsc-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs text-vsc-text animate-in fade-in-50 zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="h-9 px-3 bg-vsc-activity flex items-center justify-between border-b border-vsc-border">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
            <VscWarning className="text-base" />
            <span>Confirm Deletion</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white"
          >
            <VscClose className="text-sm" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-2">
          <p className="text-gray-200 text-sm font-medium">
            Are you sure you want to delete <span className="font-bold text-white font-mono">"{name}"</span>?
          </p>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            {isDir
              ? "This will permanently delete this directory and all its contents from your disk."
              : "This file will be permanently deleted from your disk."}
          </p>
          <div className="mt-1 p-2 bg-vsc-bg/60 border border-vsc-border/50 rounded font-mono text-[10px] text-gray-400 break-all">
            {path}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 py-3 bg-vsc-activity/30 border-t border-vsc-border flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="px-3 py-1.5 rounded bg-vsc-hover hover:bg-vsc-hover/80 text-gray-300 hover:text-white font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            Delete {isDir ? "Directory" : "File"}
          </button>
        </div>
      </div>
    </div>
  );
};

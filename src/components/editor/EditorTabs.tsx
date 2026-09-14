import React from "react";
import { VscClose, VscDiff, VscFileCode } from "react-icons/vsc";
import { useEditorStore } from "../../store/editorStore";

export const EditorTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-vsc-activity text-gray-400 overflow-x-auto select-none border-b border-vsc-border h-9">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-tauri-drag-region="false"
            className={`no-drag group flex items-center gap-2 px-3 h-full border-r border-vsc-border cursor-pointer text-xs font-medium transition-colors min-w-[120px] max-w-[200px] ${
              isActive
                ? "bg-vsc-tabActive text-white border-t-2 border-t-blue-500"
                : "bg-vsc-tab hover:bg-vsc-tabActive/50 hover:text-gray-200"
            }`}
          >
            {tab.diffMode ? (
              <VscDiff className="text-amber-400 text-sm flex-shrink-0" />
            ) : (
              <VscFileCode className="text-blue-400 text-sm flex-shrink-0" />
            )}

            <span className="truncate flex-1 text-[12px]">{tab.title}</span>

            {/* Dirty indicator or close button */}
            <div className="flex items-center">
              {tab.isDirty ? (
                <span className="w-2 h-2 rounded-full bg-white group-hover:hidden mr-1" />
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-vsc-hover text-gray-400 hover:text-white ${
                  tab.isDirty ? "hidden group-hover:block" : ""
                }`}
              >
                <VscClose className="text-xs" />
              </button>
            </div>
          </div>
        );
      })}
      {/* Empty space filler */}
      <div className="flex-1 h-full" />
    </div>
  );
};

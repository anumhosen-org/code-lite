import React from "react";
import {
  VscFiles,
  VscSearch,
  VscTerminal,
  VscSparkle,
  VscSettingsGear,
} from "react-icons/vsc";
import { ActiveSidebarView } from "../../types";
import { useTerminalStore } from "../../store/terminalStore";
import { useAgentStore } from "../../store/agentStore";
import { useSettingsStore } from "../../store/settingsStore";

interface ActivityBarProps {
  activeView: ActiveSidebarView;
  setActiveView: (view: ActiveSidebarView) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  setActiveView,
}) => {
  const { toggleTerminal } = useTerminalStore();
  const { togglePanel, isPanelOpen } = useAgentStore();
  const { setModalOpen } = useSettingsStore();

  const handleViewClick = (view: ActiveSidebarView) => {
    if (activeView === view) {
      setActiveView(null);
    } else {
      setActiveView(view);
    }
  };

  return (
    <aside
      data-tauri-drag-region="false"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      className="no-drag w-12 bg-vsc-activity text-gray-400 flex flex-col items-center justify-between py-2 border-r border-vsc-border select-none z-40 flex-shrink-0"
    >
      {/* Top Primary Navigation */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Explorer */}
        <button
          onClick={() => handleViewClick("explorer")}
          title="Explorer (Ctrl+Shift+E)"
          className={`w-12 h-11 flex items-center justify-center relative transition-colors ${
            activeView === "explorer"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "explorer" && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
          )}
          <VscFiles className="text-2xl" />
        </button>

        {/* Search */}
        <button
          onClick={() => handleViewClick("search")}
          title="Search (Ctrl+Shift+F)"
          className={`w-12 h-11 flex items-center justify-center relative transition-colors ${
            activeView === "search"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "search" && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
          )}
          <VscSearch className="text-2xl" />
        </button>

        {/* Terminal Toggle */}
        <button
          onClick={toggleTerminal}
          title="Toggle Terminal"
          className="w-12 h-11 flex items-center justify-center hover:text-white transition-colors"
        >
          <VscTerminal className="text-2xl" />
        </button>

        {/* Agent Toggle */}
        <button
          onClick={togglePanel}
          title="Coding Agent"
          className={`w-12 h-11 flex items-center justify-center relative transition-colors ${
            isPanelOpen
              ? "text-blue-400 bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {isPanelOpen && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
          )}
          <VscSparkle className="text-2xl" />
        </button>
      </div>

      {/* Bottom Settings Navigation */}
      <div className="flex flex-col items-center w-full">
        <button
          onClick={() => setModalOpen(true)}
          title="Settings & LLM Configuration"
          className="w-12 h-11 flex items-center justify-center hover:text-white transition-colors"
        >
          <VscSettingsGear className="text-2xl" />
        </button>
      </div>
    </aside>
  );
};

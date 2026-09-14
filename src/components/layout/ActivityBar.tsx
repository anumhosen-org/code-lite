import React from "react";
import {
  VscFiles,
  VscSearch,
  VscTerminal,
  VscSparkle,
  VscSettingsGear,
  VscPackage,
  VscServerProcess,
  VscBook,
} from "react-icons/vsc";
import { ActiveSidebarView } from "../../types";
import { useTerminalStore } from "../../store/terminalStore";
import { useAgentStore } from "../../store/agentStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useLocalAiStore } from "../../store/localAiStore";

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
  const { sidecarStatus } = useLocalAiStore();

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
      className="no-drag w-10 bg-vsc-activity text-gray-400 flex flex-col items-center justify-between py-1 border-r border-vsc-border select-none z-40 flex-shrink-0"
    >
      {/* Top Primary Navigation */}
      <div className="flex flex-col items-center w-full">
        {/* Explorer */}
        <button
          onClick={() => handleViewClick("explorer")}
          title="Explorer (Ctrl+Shift+E)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            activeView === "explorer"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "explorer" && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscFiles className="text-lg" />
        </button>

        {/* Search */}
        <button
          onClick={() => handleViewClick("search")}
          title="Search (Ctrl+Shift+F)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            activeView === "search"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "search" && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscSearch className="text-lg" />
        </button>

        {/* Local Models */}
        <button
          onClick={() => handleViewClick("models")}
          title="Local Models & GGUF Library (Ctrl+Shift+M)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            activeView === "models"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "models" && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscPackage className="text-lg" />
          {sidecarStatus?.is_running && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500 ring-2 ring-vsc-activity" />
          )}
        </button>

        {/* llama.cpp Engine */}
        <button
          onClick={() => handleViewClick("engine")}
          title="Engine & Hardware Supervisor (Ctrl+Shift+U)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            activeView === "engine"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "engine" && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscServerProcess className="text-lg" />
        </button>

        {/* Offline Knowledge & MCP */}
        <button
          onClick={() => handleViewClick("knowledge")}
          title="Tauri Knowledge Base & MCP Hub (Ctrl+Shift+K)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            activeView === "knowledge"
              ? "text-white bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {activeView === "knowledge" && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscBook className="text-lg" />
        </button>

        {/* Terminal Toggle */}
        <button
          onClick={toggleTerminal}
          title="Toggle Terminal"
          className="w-full h-9 flex items-center justify-center hover:text-white transition-colors"
        >
          <VscTerminal className="text-lg" />
        </button>

        {/* Agent Toggle */}
        <button
          onClick={togglePanel}
          title="Coding Agent (Ctrl+L)"
          className={`w-full h-9 flex items-center justify-center relative transition-colors ${
            isPanelOpen
              ? "text-blue-400 bg-vsc-activityActive"
              : "hover:text-white"
          }`}
        >
          {isPanelOpen && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
          )}
          <VscSparkle className="text-lg" />
        </button>
      </div>

      {/* Bottom Settings Navigation */}
      <div className="flex flex-col items-center w-full">
        <button
          onClick={() => setModalOpen(true)}
          title="Settings & LLM Configuration"
          className="w-full h-9 flex items-center justify-center hover:text-white transition-colors"
        >
          <VscSettingsGear className="text-lg" />
        </button>
      </div>
    </aside>
  );
};

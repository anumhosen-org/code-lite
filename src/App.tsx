import React, { useState, useEffect } from "react";
import {
  VscSourceControl,
  VscSparkle,
  VscFeedback,
  VscCheck,
} from "react-icons/vsc";
import { useWorkspaceStore } from "./store/workspaceStore";
import { useEditorStore } from "./store/editorStore";
import { useTerminalStore } from "./store/terminalStore";
import { useAgentStore } from "./store/agentStore";
import { useSettingsStore } from "./store/settingsStore";
import { useLayoutStore } from "./store/layoutStore";
import { TitleBar } from "./components/layout/TitleBar";
import { ActivityBar } from "./components/layout/ActivityBar";
import { ExplorerSidebar } from "./components/explorer/ExplorerSidebar";
import { SearchSidebar } from "./components/search/SearchSidebar";
import { ModelsSidebarView } from "./components/models/ModelsSidebarView";
import { EngineSidebarView } from "./components/engine/EngineSidebarView";
import { ModelsDashboard } from "./components/models/ModelsDashboard";
import { EngineDashboard } from "./components/engine/EngineDashboard";
import { EditorContainer } from "./components/editor/EditorContainer";
import { TerminalContainer } from "./components/terminal/TerminalContainer";
import { AgentPanel } from "./components/agent/AgentPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useLocalAiStore } from "./store/localAiStore";


export const App: React.FC = () => {
  const { setWorkspacePath } = useWorkspaceStore();
  const { tabs, activeTabId } = useEditorStore();
  const { toggleTerminal } = useTerminalStore();
  const { togglePanel, isPanelOpen } = useAgentStore();
  const { activeProvider, providers } = useSettingsStore();
  const {
    sidebarWidth,
    setSidebarWidth,
    activeSidebarView,
    setActiveSidebarView,
    toggleSidebar,
  } = useLayoutStore();

  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarStartXRef = React.useRef(0);
  const startSidebarWidthRef = React.useRef(sidebarWidth);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeModel = providers[activeProvider]?.model || "unknown";

  const {
    expandedDashboard,
    sidecarStatus,
    initListeners,
    fetchHardwareAndEngine,
    refreshInstalledModels,
  } = useLocalAiStore();

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSidebarResizing(true);
    sidebarStartXRef.current = e.clientX;
    startSidebarWidthRef.current = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - sidebarStartXRef.current;
      setSidebarWidth(startSidebarWidthRef.current + delta);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Initial load workspace & local AI state
  useEffect(() => {
    setWorkspacePath("d:\\Development\\TAURI\\Code Lite");
    fetchHardwareAndEngine();
    refreshInstalledModels();

    let cleanup: (() => void) | undefined;
    initListeners().then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchHardwareAndEngine, refreshInstalledModels, initListeners]);

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B: toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+`: toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
      }
      // Ctrl+L: toggle agent
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        togglePanel();
      }
      // Ctrl+Shift+F: search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setActiveSidebarView("search");
      }
      // Ctrl+Shift+E: explorer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setActiveSidebarView("explorer");
      }
      // Ctrl+Shift+M: models
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "M") {
        e.preventDefault();
        setActiveSidebarView("models");
      }
      // Ctrl+Shift+U: engine
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "U") {
        e.preventDefault();
        setActiveSidebarView("engine");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminal, togglePanel, toggleSidebar, setActiveSidebarView]);

  return (
    <div className="h-screen w-screen flex flex-col bg-vsc-bg text-vsc-text overflow-hidden select-none font-sans">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Activity Bar */}
        <ActivityBar
          activeView={activeSidebarView}
          setActiveView={setActiveSidebarView}
        />

        {/* Primary Sidebar (Explorer, Search, Models, or Engine) - Resizable */}
        {activeSidebarView && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="h-full border-r border-vsc-border flex-shrink-0 relative"
          >
            {activeSidebarView === "explorer" && <ExplorerSidebar />}
            {activeSidebarView === "search" && <SearchSidebar />}
            {activeSidebarView === "models" && <ModelsSidebarView />}
            {activeSidebarView === "engine" && <EngineSidebarView />}

            {/* Right Resize Drag Handle */}
            <div
              onMouseDown={handleSidebarMouseDown}
              className={`w-1 h-full absolute top-0 -right-0.5 cursor-col-resize hover:bg-blue-500 z-30 transition-colors ${
                isSidebarResizing ? "bg-blue-500" : "bg-transparent"
              }`}
            />
          </aside>
        )}

        {/* Central Editor & Bottom Terminal */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <EditorContainer />
          <TerminalContainer />
        </main>

        {/* Right Collapsible Agent Panel */}
        {isPanelOpen && <AgentPanel />}
      </div>

      {/* VS Code Bottom Status Bar */}
      <footer className="h-6 bg-vsc-status text-white flex items-center justify-between px-2 text-[11px] font-medium z-40 select-none flex-shrink-0">
        {/* Left Status Area */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
            <VscSourceControl />
            <span>main*</span>
          </div>
          <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
            <VscCheck />
            <span>Ready</span>
          </div>
        </div>

        {/* Right Status Area */}
        <div className="flex items-center gap-3">
          {activeTab && (
            <>
              <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
                UTF-8
              </span>
              <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer capitalize">
                {activeTab.language}
              </span>
            </>
          )}

          {/* Local Engine Status Indicator */}
          <div
            onClick={() => setActiveSidebarView(activeSidebarView === "models" ? null : "models")}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ${
              sidecarStatus?.is_running
                ? "bg-green-900/60 hover:bg-green-800 text-green-300"
                : "bg-white/5 hover:bg-white/10 text-gray-400"
            }`}
            title={
              sidecarStatus?.is_running
                ? `Local Engine Active: ${sidecarStatus.current_model || "llama-server"} on port ${sidecarStatus.port}`
                : "Local Engine Offline - Click to configure models"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sidecarStatus?.is_running ? "bg-green-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="font-mono text-[10px]">
              {sidecarStatus?.is_running
                ? `Local: ${sidecarStatus.current_model?.split(/[/\\]/).pop()?.slice(0, 14) || "Active"}`
                : "Offline Engine"}
            </span>
          </div>

          {/* Agent Model Status Pill */}
          <div
            onClick={togglePanel}
            className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer bg-blue-800/60"
            title="Click to toggle Agent panel"
          >
            <VscSparkle className="text-yellow-300" />
            <span className="font-mono text-[10px] truncate max-w-[120px]">{activeModel}</span>
          </div>

          <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
            <VscFeedback />
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Full Screen Dashboards */}
      {expandedDashboard === "models" && <ModelsDashboard />}
      {expandedDashboard === "engine" && <EngineDashboard />}
    </div>
  );
};

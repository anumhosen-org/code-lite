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
import { useLayoutStore } from "./store/layoutStore";
import { TitleBar } from "./components/layout/TitleBar";
import { ActivityBar } from "./components/layout/ActivityBar";
import { ExplorerSidebar } from "./components/explorer/ExplorerSidebar";
import { SearchSidebar } from "./components/search/SearchSidebar";
import { ModelsSidebarView } from "./components/models/ModelsSidebarView";
import { EngineSidebarView } from "./components/engine/EngineSidebarView";
import { KnowledgeSidebarView } from "./components/knowledge/KnowledgeSidebarView";
import { EditorContainer } from "./components/editor/EditorContainer";
import { AgentPanel } from "./components/agent/AgentPanel";
import { useLocalAiStore } from "./store/localAiStore";

// VS Code-style Deferred Subsystems (Lazy Chunks)
const KnowledgeDashboard = React.lazy(() =>
  import("./components/knowledge/KnowledgeDashboard").then((m) => ({ default: m.KnowledgeDashboard }))
);
const ModelsDashboard = React.lazy(() =>
  import("./components/models/ModelsDashboard").then((m) => ({ default: m.ModelsDashboard }))
);
const EngineDashboard = React.lazy(() =>
  import("./components/engine/EngineDashboard").then((m) => ({ default: m.EngineDashboard }))
);
const SettingsModal = React.lazy(() =>
  import("./components/settings/SettingsModal").then((m) => ({ default: m.SettingsModal }))
);
const TerminalContainer = React.lazy(() =>
  import("./components/terminal/TerminalContainer").then((m) => ({ default: m.TerminalContainer }))
);


export const App: React.FC = () => {
  const { setWorkspacePath, workspacePath } = useWorkspaceStore();
  const { tabs, activeTabId } = useEditorStore();
  const { toggleTerminal } = useTerminalStore();
  const { togglePanel, isPanelOpen, loadWorkspaceSessions } = useAgentStore();
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

  // Sync workspace session history on workspace folder changes
  useEffect(() => {
    if (workspacePath) {
      loadWorkspaceSessions(workspacePath);
    }
  }, [workspacePath, loadWorkspaceSessions]);

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
      // Ctrl+Shift+K: knowledge
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setActiveSidebarView("knowledge");
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

        {/* Primary Sidebar (Explorer, Search, Models, Engine, Knowledge) - Resizable */}
        {activeSidebarView && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="h-full border-r border-vsc-border flex-shrink-0 relative"
          >
            {activeSidebarView === "explorer" && <ExplorerSidebar />}
            {activeSidebarView === "search" && <SearchSidebar />}
            {activeSidebarView === "models" && <ModelsSidebarView />}
            {activeSidebarView === "engine" && <EngineSidebarView />}
            {activeSidebarView === "knowledge" && <KnowledgeSidebarView />}

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
          <React.Suspense fallback={null}>
            <TerminalContainer />
          </React.Suspense>
        </main>

        {/* Right Collapsible Agent Panel */}
        {isPanelOpen && <AgentPanel />}
      </div>

      {/* VS Code Bottom Status Bar (Compact Antigravity Design) */}
      <footer className="h-[22px] bg-vsc-status border-t border-vsc-border text-gray-400 flex items-center justify-between px-2 text-[11px] leading-none z-40 select-none flex-shrink-0">
        {/* Left Status Area */}
        <div className="flex items-center gap-1.5 h-full">
          <div className="h-full flex items-center gap-1 hover:bg-white/10 px-1.5 rounded cursor-pointer text-gray-300 hover:text-white transition-colors">
            <VscSourceControl className="text-xs" />
            <span>main*</span>
          </div>
          <div className="h-full flex items-center gap-1 hover:bg-white/10 px-1.5 rounded cursor-pointer text-gray-300 hover:text-white transition-colors">
            <VscCheck className="text-xs" />
            <span>Ready</span>
          </div>
        </div>

        {/* Right Status Area */}
        <div className="flex items-center gap-1.5 h-full">
          {activeTab && (
            <>
              <span className="h-full flex items-center hover:bg-white/10 px-1.5 rounded cursor-pointer text-gray-400 hover:text-white transition-colors">
                UTF-8
              </span>
              <span className="h-full flex items-center hover:bg-white/10 px-1.5 rounded cursor-pointer capitalize text-gray-400 hover:text-white transition-colors">
                {activeTab.language}
              </span>
            </>
          )}

          {/* Local Engine Status Indicator */}
          <div
            onClick={() => setActiveSidebarView(activeSidebarView === "models" ? null : "models")}
            className={`h-full flex items-center gap-1.5 px-2 rounded cursor-pointer transition-colors ${
              sidecarStatus?.is_running
                ? "bg-green-950/60 hover:bg-green-900 text-green-300 border border-green-800/40"
                : "bg-white/5 hover:bg-white/10 text-gray-400"
            }`}
            title={
              sidecarStatus?.is_running
                ? `Local Engine Active on port ${sidecarStatus.port}`
                : "Local Engine Offline - Click to configure models"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sidecarStatus?.is_running ? "bg-green-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="font-mono text-[10px]">
              {sidecarStatus?.is_running ? "Engine: Active" : "Engine: Offline"}
            </span>
          </div>

          {/* Agent Status Indicator */}
          <div
            onClick={togglePanel}
            className={`h-full flex items-center gap-1 px-2 rounded cursor-pointer transition-colors ${
              isPanelOpen
                ? "bg-white/10 text-white"
                : "hover:bg-white/10 text-gray-400 hover:text-white"
            }`}
            title="Toggle Agent panel (Ctrl+L)"
          >
            <VscSparkle className="text-yellow-400 text-xs" />
            <span className="font-medium text-[10px]">Agent</span>
          </div>

          <div className="h-full flex items-center hover:bg-white/10 px-1.5 rounded cursor-pointer text-gray-400 hover:text-white transition-colors">
            <VscFeedback className="text-xs" />
          </div>
        </div>
      </footer>

      {/* Settings Modal & Full Screen Dashboards */}
      <React.Suspense fallback={null}>
        <SettingsModal />
        {expandedDashboard === "models" && <ModelsDashboard />}
        {expandedDashboard === "engine" && <EngineDashboard />}
        {expandedDashboard === "knowledge" && <KnowledgeDashboard />}
      </React.Suspense>
    </div>
  );
};

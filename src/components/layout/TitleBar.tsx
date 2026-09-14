import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  VscChromeMinimize,
  VscChromeMaximize,
  VscChromeRestore,
  VscChromeClose,
  VscLayoutSidebarLeft,
  VscLayoutPanel,
  VscLayoutSidebarRight,
} from "react-icons/vsc";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEditorStore } from "../../store/editorStore";
import { useTerminalStore } from "../../store/terminalStore";
import { useAgentStore } from "../../store/agentStore";
import { useLayoutStore } from "../../store/layoutStore";
import appIcon from "../../assets/icon.png";

import { MenuBar } from "./MenuBar";

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = useEditorStore((s) => s.tabs.find((t) => t.id === activeTabId));
  const { isOpen: isTerminalOpen, toggleTerminal } = useTerminalStore();
  const { isPanelOpen: isAgentOpen, togglePanel } = useAgentStore();
  const { activeSidebarView, toggleSidebar } = useLayoutStore();

  useEffect(() => {
    const checkMax = async () => {
      try {
        const isMax = await invoke<boolean>("window_is_maximized");
        setIsMaximized(isMax);
      } catch (err) {
        console.error("Check maximized failed:", err);
      }
    };
    checkMax();
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke("window_minimize");
    } catch (err) {
      console.error("Minimize error:", err);
    }
  };

  const handleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const isMax = await invoke<boolean>("window_toggle_maximize");
      setIsMaximized(isMax);
    } catch (err) {
      console.error("Maximize error:", err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke("window_close");
    } catch (err) {
      console.error("Close error:", err);
    }
  };

  const workspaceName = workspacePath ? workspacePath.split(/[/\\]/).pop() : "Code Lite";
  const titleDisplay = activeTab
    ? `${activeTab.title} — ${workspaceName}`
    : `${workspaceName} — Code Lite`;

  return (
    <header className="h-8 bg-vsc-activity text-vsc-text flex items-center justify-between border-b border-vsc-border select-none text-xs px-2 z-50 flex-shrink-0">
      {/* Left: App Icon & Application Menu Bar */}
      <div className="flex items-center gap-1.5 z-50">
        <div
          data-tauri-drag-region
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          className="flex items-center cursor-default py-1 pl-1 pr-2 drag"
        >
          <img
            src={appIcon}
            alt="Code Lite"
            className="w-4 h-4 object-contain pointer-events-none select-none"
          />
        </div>

        <MenuBar />
      </div>

      {/* Center: Draggable region across entire empty title bar */}
      <div
        data-tauri-drag-region
        onDoubleClick={() => handleMaximize()}
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        className="flex-1 h-full flex items-center justify-center truncate px-4 text-gray-400 text-[11px] cursor-default"
      >
        <span className="pointer-events-none truncate">{titleDisplay}</span>
      </div>

      {/* Right: Layout Toggles & Window Controls (Strictly NO-DRAG) */}
      <div
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="flex items-center z-50"
      >
        {/* Antigravity-style Three Button Layout Pill */}
        <div
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          className="flex items-center bg-vsc-sidebar/90 border border-vsc-border/80 rounded p-0.5 mr-2.5 no-drag gap-0.5"
        >
          {/* Toggle Explorer / Primary Sidebar */}
          <button
            onClick={toggleSidebar}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            title="Toggle Primary Sidebar (Ctrl+B)"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              activeSidebarView !== null
                ? "bg-vsc-hover text-blue-400 font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-vsc-hover/60"
            }`}
          >
            <VscLayoutSidebarLeft className="text-sm pointer-events-none" />
          </button>

          {/* Toggle Bottom Terminal Panel */}
          <button
            onClick={toggleTerminal}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            title="Toggle Bottom Terminal Panel (Ctrl+`)"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              isTerminalOpen
                ? "bg-vsc-hover text-blue-400 font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-vsc-hover/60"
            }`}
          >
            <VscLayoutPanel className="text-sm pointer-events-none" />
          </button>

          {/* Toggle Coding Agent Panel */}
          <button
            onClick={togglePanel}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            title="Toggle Coding Agent Panel (Ctrl+L)"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              isAgentOpen
                ? "bg-vsc-hover text-blue-400 font-medium"
                : "text-gray-400 hover:text-gray-200 hover:bg-vsc-hover/60"
            }`}
          >
            <VscLayoutSidebarRight className="text-sm pointer-events-none" />
          </button>
        </div>

        {/* Window controls with VscChrome icons */}
        <div
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          className="flex items-center h-8 -mr-2"
        >
          <button
            onClick={handleMinimize}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 w-10 flex items-center justify-center hover:bg-vsc-hover text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Minimize"
          >
            <VscChromeMinimize className="text-xs pointer-events-none" />
          </button>

          <button
            onClick={() => handleMaximize()}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 w-10 flex items-center justify-center hover:bg-vsc-hover text-gray-300 hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <VscChromeRestore className="text-lg pointer-events-none" />
            ) : (
              <VscChromeMaximize className="text-xs pointer-events-none" />
            )}
          </button>

          <button
            onClick={handleClose}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 w-10 flex items-center justify-center hover:bg-[#e81123] text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <VscChromeClose className="text-xs pointer-events-none" />
          </button>
        </div>
      </div>
    </header>
  );
};

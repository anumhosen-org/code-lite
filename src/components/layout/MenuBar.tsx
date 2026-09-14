import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../../store/editorStore";
import { useTerminalStore } from "../../store/terminalStore";
import { useAgentStore } from "../../store/agentStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useLocalAiStore } from "../../store/localAiStore";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const { saveActiveFile, closeActiveTab } = useEditorStore();
  const { toggleTerminal, addTerminal, profiles } = useTerminalStore();
  const { togglePanel, clearChat } = useAgentStore();
  const { setActiveSidebarView } = useLayoutStore();
  const { setExpandedDashboard } = useLocalAiStore();
  const {
    setModalOpen,
    editorSettings,
    toggleWordWrap,
    toggleMinimap,
    toggleAutoSave,
  } = useSettingsStore();
  const {
    refreshTree,
    openFolderDialog,
    openFileDialog,
    closeFolder,
    workspacePath,
  } = useWorkspaceStore();

  // Global keyboard shortcuts (Ctrl+O, Ctrl+Shift+O, Ctrl+W, Alt+Z)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFileDialog();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFolderDialog();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        closeActiveTab();
      } else if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        toggleWordWrap();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [openFileDialog, openFolderDialog, closeActiveTab, toggleWordWrap]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
      }
    };

    if (activeMenuId) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuId]);

  const menus: MenuCategory[] = [
    {
      id: "file",
      label: "File",
      items: [
        {
          label: "New File",
          shortcut: "Ctrl+N",
          action: () => {
            const sep = workspacePath.includes("/") ? "/" : "\\";
            const untitledPath = `${workspacePath || "C:"}${sep}untitled-${Date.now().toString().slice(-4)}.txt`;
            useEditorStore.getState().openFile(untitledPath);
          },
        },
        {
          label: "Open File...",
          shortcut: "Ctrl+O",
          action: () => openFileDialog(),
        },
        {
          label: "Open Folder...",
          shortcut: "Ctrl+Shift+O",
          action: () => openFolderDialog(),
        },
        { separator: true, label: "" },
        {
          label: "Save",
          shortcut: "Ctrl+S",
          action: () => saveActiveFile(),
        },
        {
          label: `Auto Save${editorSettings.autoSave !== "off" ? " ✓" : ""}`,
          action: () => toggleAutoSave(),
        },
        { separator: true, label: "" },
        {
          label: "Close Editor",
          shortcut: "Ctrl+W",
          action: () => closeActiveTab(),
        },
        {
          label: "Close Folder",
          action: () => closeFolder(),
        },
        { separator: true, label: "" },
        {
          label: "Refresh Workspace",
          action: () => refreshTree(),
        },
        { separator: true, label: "" },
        {
          label: "Exit",
          shortcut: "Alt+F4",
          action: () => invoke("window_close"),
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          action: () => document.execCommand("undo"),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          action: () => document.execCommand("redo"),
        },
        { separator: true, label: "" },
        {
          label: "Cut",
          shortcut: "Ctrl+X",
          action: () => document.execCommand("cut"),
        },
        {
          label: "Copy",
          shortcut: "Ctrl+C",
          action: () => document.execCommand("copy"),
        },
        {
          label: "Paste",
          shortcut: "Ctrl+V",
          action: () => document.execCommand("paste"),
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        {
          label: `Word Wrap${editorSettings.wordWrap !== "off" ? " ✓" : ""}`,
          shortcut: "Alt+Z",
          action: () => toggleWordWrap(),
        },
        {
          label: `Minimap${editorSettings.minimap ? " ✓" : ""}`,
          action: () => toggleMinimap(),
        },
        { separator: true, label: "" },
        {
          label: "Toggle Terminal",
          shortcut: "Ctrl+`",
          action: () => toggleTerminal(),
        },
        {
          label: "Toggle Coding Agent",
          shortcut: "Ctrl+L",
          action: () => togglePanel(),
        },
        { separator: true, label: "" },
        {
          label: "Local Models View",
          shortcut: "Ctrl+Shift+M",
          action: () => setActiveSidebarView("models"),
        },
        {
          label: "llama.cpp Engine View",
          shortcut: "Ctrl+Shift+U",
          action: () => setActiveSidebarView("engine"),
        },
        {
          label: "Tauri Knowledge & MCP Hub",
          shortcut: "Ctrl+Shift+K",
          action: () => setActiveSidebarView("knowledge"),
        },
        {
          label: "Open Models Dashboard",
          action: () => setExpandedDashboard("models"),
        },
        {
          label: "Open Engine Dashboard",
          action: () => setExpandedDashboard("engine"),
        },
        {
          label: "Open Knowledge Dashboard",
          action: () => setExpandedDashboard("knowledge"),
        },
        { separator: true, label: "" },
        {
          label: "Settings & Preferences",
          action: () => setModalOpen(true),
        },
      ],
    },
    {
      id: "terminal",
      label: "Terminal",
      items: [
        {
          label: "New Terminal",
          action: () => addTerminal(),
        },
        ...(profiles.length > 0
          ? [
              { separator: true, label: "" },
              ...profiles.map((p) => ({
                label: `New ${p.name}`,
                action: () => addTerminal(p),
              })),
            ]
          : []),
        { separator: true, label: "" },
        {
          label: "Toggle Terminal Panel",
          shortcut: "Ctrl+`",
          action: () => toggleTerminal(),
        },
      ],
    },
    {
      id: "agent",
      label: "Agent",
      items: [
        {
          label: "Open Agent Panel",
          shortcut: "Ctrl+L",
          action: () => togglePanel(),
        },
        {
          label: "Clear Conversation",
          action: () => clearChat(),
        },
        { separator: true, label: "" },
        {
          label: "Manage Local Models...",
          action: () => setExpandedDashboard("models"),
        },
        {
          label: "Manage llama.cpp Engine...",
          action: () => setExpandedDashboard("engine"),
        },
        {
          label: "Offline Knowledge & MCP Hub...",
          action: () => setExpandedDashboard("knowledge"),
        },
        { separator: true, label: "" },
        {
          label: "Configure LLM Providers...",
          action: () => setModalOpen(true),
        },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        {
          label: "About Code Lite",
          action: () => {
            alert("Code Lite v0.1.0\nA lightweight, high-performance agentic code editor built with Tauri 2.0 and Monaco Editor.");
          },
        },
      ],
    },
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenuId((prev) => (prev === menuId ? null : menuId));
  };

  const handleMouseEnter = (menuId: string) => {
    if (activeMenuId !== null && activeMenuId !== menuId) {
      setActiveMenuId(menuId);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenuId(null);
  };

  return (
    <div
      ref={menuBarRef}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      className="flex items-center text-xs select-none no-drag z-50 relative"
    >
      {menus.map((menu) => {
        const isOpen = activeMenuId === menu.id;
        return (
          <div key={menu.id} className="relative">
            <button
              onClick={() => handleMenuClick(menu.id)}
              onMouseEnter={() => handleMouseEnter(menu.id)}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors cursor-pointer ${
                isOpen
                  ? "bg-vsc-hover text-white font-medium"
                  : "text-gray-300 hover:bg-vsc-hover hover:text-white"
              }`}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className="absolute left-0 top-full mt-0.5 w-52 bg-vsc-sidebar border border-vsc-border rounded shadow-2xl py-1 z-50 flex flex-col text-xs select-none animate-in fade-in-50 duration-75"
              >
                {menu.items.map((item, idx) => {
                  if (item.separator) {
                    return (
                      <div
                        key={idx}
                        className="my-1 border-t border-vsc-border/60"
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 cursor-pointer transition-colors text-[11px]"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-gray-400 text-[10px] font-mono ml-4">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

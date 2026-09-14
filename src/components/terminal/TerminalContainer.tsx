import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  VscAdd,
  VscClose,
  VscTerminal,
  VscSparkle,
  VscChevronDown,
  VscTerminalPowershell,
  VscTerminalCmd,
  VscTerminalBash,
  VscTerminalLinux,
  VscCheck,
} from "react-icons/vsc";
import { useTerminalStore } from "../../store/terminalStore";
import { TerminalTab } from "./TerminalTab";

export const TerminalContainer: React.FC = () => {
  const {
    isOpen,
    terminals,
    activeTerminalId,
    height,
    profiles,
    defaultProfileId,
    loadProfiles,
    setActiveTerminalId,
    addTerminal,
    switchTerminalProfile,
    setDefaultProfileId,
    closeTerminal,
    toggleTerminal,
    setHeight,
  } = useTerminalStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ left: number; bottom: number } | null>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(height);

  // Load available system profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Click outside or escape to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };
    const handleWindowChange = () => {
      setIsProfileMenuOpen(false);
    };

    if (isProfileMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("resize", handleWindowChange);
      window.addEventListener("scroll", handleWindowChange, true);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isProfileMenuOpen]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = dragStartYRef.current - moveEvent.clientY;
      setHeight(startHeightRef.current + delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleToggleMenu = () => {
    if (!isProfileMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuCoords({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 272)),
        bottom: window.innerHeight - rect.top + 6,
      });
      setIsProfileMenuOpen(true);
    } else {
      setIsProfileMenuOpen(false);
    }
  };

  const getProfileIcon = (icon?: string, isAgent?: boolean, className = "text-xs") => {
    if (isAgent) return <VscSparkle className={`${className} text-purple-400`} />;
    switch (icon) {
      case "powershell":
      case "pwsh":
        return <VscTerminalPowershell className={`${className} text-sky-400`} />;
      case "cmd":
        return <VscTerminalCmd className={`${className} text-neutral-300`} />;
      case "bash":
      case "git-bash":
        return <VscTerminalBash className={`${className} text-amber-400`} />;
      case "wsl":
        return <VscTerminalLinux className={`${className} text-emerald-400`} />;
      default:
        return <VscTerminal className={`${className} text-gray-400`} />;
    }
  };

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);
  const defaultProfile = profiles.find((p) => p.id === defaultProfileId);

  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full flex flex-col bg-vsc-bg border-t border-vsc-border z-30 select-none relative flex-shrink-0"
    >
      {/* Resizable Top Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`h-1 w-full absolute -top-0.5 left-0 cursor-row-resize hover:bg-blue-500 transition-colors z-40 ${
          isDragging ? "bg-blue-500" : "bg-transparent"
        }`}
      />

      {/* Terminal Header Bar */}
      <div className="h-8 bg-vsc-sidebar flex items-center justify-between px-2 border-b border-vsc-border relative z-30 select-none">
        {/* Left Side: Terminal Tabs ONLY (isolated horizontal scroll, no buttons inside) */}
        <div className="flex-1 min-w-0 flex items-center overflow-x-auto py-1 gap-1 mr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {terminals.map((term) => {
            const isActive = term.id === activeTerminalId;
            return (
              <div
                key={term.id}
                onClick={() => setActiveTerminalId(term.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs cursor-pointer transition-colors flex-shrink-0 group ${
                  isActive
                    ? "bg-vsc-bg text-white font-medium shadow-sm border border-vsc-border/40"
                    : "text-gray-400 hover:bg-vsc-hover hover:text-gray-200"
                }`}
                title={`${term.name}${term.shellPath ? ` (${term.shellPath})` : ""}`}
              >
                {getProfileIcon(term.icon, term.isAgent)}
                <span className="text-[11px] truncate max-w-[120px]">{term.name}</span>
                {terminals.length > 1 && !term.isAgent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTerminal(term.id);
                    }}
                    className="p-0.5 rounded hover:bg-vsc-hover text-gray-500 hover:text-white ml-0.5 transition-colors"
                    title="Kill Terminal"
                  >
                    <VscClose className="text-[10px]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: New Terminal Split Button, Shell Status, Close Panel */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* New Terminal & Profile Picker Split Button */}
          <div ref={buttonRef} className="flex items-center rounded bg-vsc-hover/70 border border-vsc-border/60 text-gray-300">
            <button
              onClick={() => addTerminal()}
              title={`New Terminal (${defaultProfile ? defaultProfile.name : "Default"})`}
              className="p-1 hover:bg-vsc-hover hover:text-white transition-colors rounded-l flex items-center"
            >
              <VscAdd className="text-xs" />
            </button>
            <button
              onClick={handleToggleMenu}
              title="Select Terminal Profile (CMD, PowerShell, Bash, WSL)"
              className="px-1 py-1 hover:bg-vsc-hover hover:text-white transition-colors rounded-r border-l border-vsc-border/40 flex items-center"
            >
              <VscChevronDown className="text-[10px]" />
            </button>
          </div>

          {activeTerminal && (
            <span className="text-[10px] text-gray-500 hidden sm:inline-block px-1">
              {activeTerminal.isAgent ? "Agent Runner" : activeTerminal.name}
            </span>
          )}

          <button
            onClick={toggleTerminal}
            title="Close Terminal Panel (Ctrl+`)"
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
          >
            <VscClose className="text-sm" />
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="flex-1 w-full overflow-hidden relative">
        {terminals.map((term) => (
          <TerminalTab
            key={`${term.id}-${term.shellPath || "default"}`}
            id={term.id}
            isVisible={term.id === activeTerminalId}
            shellPath={term.shellPath}
            shellArgs={term.shellArgs}
          />
        ))}
      </div>

      {/* Profile Selection Dropdown Menu via Portal to document.body (Zero scrollbar, clean popout) */}
      {isProfileMenuOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: `${menuCoords.left}px`,
              bottom: `${menuCoords.bottom}px`,
              zIndex: 99999,
            }}
            className="w-64 bg-vsc-sidebar border border-vsc-border rounded-md shadow-2xl py-1.5 flex flex-col text-xs select-none backdrop-blur-md animate-in fade-in-50 duration-75"
          >
            {/* Section 1: Launch Terminal Profile */}
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Launch Terminal Profile
            </div>
            {profiles.map((prof) => (
              <button
                key={`launch-${prof.id}`}
                onClick={() => {
                  addTerminal(prof);
                  setIsProfileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
              >
                {getProfileIcon(prof.icon)}
                <span className="flex-1 truncate">{prof.name}</span>
                {prof.id === defaultProfileId && (
                  <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                    Default
                  </span>
                )}
              </button>
            ))}

            {/* Section 2: Switch Active Terminal's Shell (if active terminal is not agent) */}
            {activeTerminal && !activeTerminal.isAgent && (
              <>
                <div className="my-1 border-t border-vsc-border/60" />
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Switch Active Terminal Shell To
                </div>
                {profiles.map((prof) => {
                  const isCurrent = activeTerminal.profileId === prof.id;
                  return (
                    <button
                      key={`switch-${prof.id}`}
                      onClick={() => {
                        switchTerminalProfile(activeTerminal.id, prof);
                        setIsProfileMenuOpen(false);
                      }}
                      disabled={isCurrent}
                      className={`flex items-center gap-2 px-3 py-1.5 text-left transition-colors text-[11px] ${
                        isCurrent
                          ? "text-gray-500 cursor-default bg-black/10"
                          : "hover:bg-vsc-selected hover:text-white text-gray-200"
                      }`}
                    >
                      {getProfileIcon(prof.icon)}
                      <span className="flex-1 truncate">{prof.name}</span>
                      {isCurrent && <VscCheck className="text-blue-400 text-xs" />}
                    </button>
                  );
                })}
              </>
            )}

            {/* Section 3: Change Default Shell */}
            <div className="my-1 border-t border-vsc-border/60" />
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Set Default Profile (Used by '+')
            </div>
            {profiles.map((prof) => {
              const isDefault = prof.id === defaultProfileId;
              return (
                <button
                  key={`default-${prof.id}`}
                  onClick={() => {
                    setDefaultProfileId(prof.id);
                    setIsProfileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-selected hover:text-white text-gray-200 text-left transition-colors text-[11px]"
                >
                  {getProfileIcon(prof.icon)}
                  <span className="flex-1 truncate">{prof.name}</span>
                  {isDefault && <VscCheck className="text-emerald-400 text-xs" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

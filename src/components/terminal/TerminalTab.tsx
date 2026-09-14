import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { terminalService } from "../../services/tauri/terminal";
import { useWorkspaceStore } from "../../store/workspaceStore";

interface TerminalTabProps {
  id: string;
  isVisible: boolean;
  shellPath?: string;
  shellArgs?: string[];
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  id,
  isVisible,
  shellPath,
  shellArgs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isSpawnedRef = useRef(false);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let unlisten: (() => void) | null = null;

    // Initialize xterm.js instance
    const term = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#528bff",
        selectionBackground: "rgba(9, 71, 113, 0.6)",
        black: "#2d3139",
        red: "#e06c75",
        green: "#98c379",
        yellow: "#e5c07b",
        blue: "#61afef",
        magenta: "#c678dd",
        cyan: "#56b6c2",
        white: "#abb2bf",
        brightBlack: "#5c6370",
        brightRed: "#e06c75",
        brightGreen: "#98c379",
        brightYellow: "#e5c07b",
        brightBlue: "#61afef",
        brightMagenta: "#c678dd",
        brightCyan: "#56b6c2",
        brightWhite: "#ffffff",
      },
      fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Forward user keystrokes to Rust PTY
    term.onData((data) => {
      terminalService.writeTerminal(id, data).catch((err) => {
        console.error("writeTerminal error:", err);
      });
    });

    // Handle terminal resize safely
    term.onResize(({ cols, rows }) => {
      if (cols >= 10 && rows >= 5) {
        terminalService.resizeTerminal(id, cols, rows).catch(() => {});
      }
    });

    const setupPty = async () => {
      try {
        // 1. Subscribe to output FIRST so initial shell prompt is never lost!
        unlisten = await terminalService.onTerminalOutput(id, (data) => {
          if (isMounted) {
            term.write(data);
          }
        });

        // 2. Only spawn if not already spawned
        if (!isSpawnedRef.current) {
          isSpawnedRef.current = true;
          const initialCols = Math.max(term.cols || 80, 20);
          const initialRows = Math.max(term.rows || 24, 5);
          await terminalService.spawnTerminal(
            id,
            workspacePath,
            initialCols,
            initialRows,
            shellPath,
            shellArgs
          );
        }
      } catch (err) {
        console.error(`Failed to setup PTY for ${id}:`, err);
        if (isMounted) {
          term.writeln(`\r\n\x1b[31mFailed to spawn terminal: ${String(err)}\x1b[0m\r\n`);
        }
      }
    };

    setupPty();

    const handleWindowResize = () => {
      if (fitAddonRef.current && isVisible) {
        try {
          fitAddonRef.current.fit();
        } catch {
          // ignore layout timing
        }
      }
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleWindowResize);
      if (unlisten) unlisten();
      term.dispose();
    };
  }, [id]);

  useEffect(() => {
    if (isVisible && fitAddonRef.current && terminalRef.current) {
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          terminalRef.current?.focus();
        } catch {
          // ignore
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      style={{ display: isVisible ? "block" : "none" }}
      className="h-full w-full p-2 bg-vsc-bg overflow-hidden"
    />
  );
};

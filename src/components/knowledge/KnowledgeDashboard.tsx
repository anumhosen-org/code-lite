import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  VscClose,
  VscBook,
  VscSearch,
  VscCheck,
  VscCopy,
  VscSparkle,
  VscRefresh,
  VscWarning,
  VscPlug,
  VscDatabase,
  VscChromeMaximize,
  VscChromeRestore,
} from "react-icons/vsc";
import { useLocalAiStore } from "../../store/localAiStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAgentStore } from "../../store/agentStore";

interface KnowledgeItem {
  id: number;
  category: string;
  title: string;
  description: string;
  code_snippet: string;
  solution: string;
  tags: string;
}

interface McpToolInfo {
  name: string;
  description: string;
  server_name: string;
  parameters: any;
}

export const KnowledgeDashboard: React.FC = () => {
  const { setExpandedDashboard } = useLocalAiStore();
  const { workspacePath } = useWorkspaceStore();
  const { togglePanel, isPanelOpen } = useAgentStore();

  const [activeTab, setActiveTab] = useState<"playbook" | "errors" | "index" | "mcp">("playbook");
  const [isMaximized, setIsMaximized] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [mcpTools, setMcpTools] = useState<McpToolInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  const categories = [
    { id: "all", label: "All Recipes" },
    { id: "state_management", label: "State Management" },
    { id: "ipc_commands", label: "IPC & Commands" },
    { id: "tauri_architecture", label: "Architecture & Permissions" },
    { id: "window_lifecycle", label: "Window & Titlebar" },
    { id: "ptys_terminal", label: "PTY Terminals" },
  ];

  const loadData = async () => {
    try {
      const list = await invoke<KnowledgeItem[]>("list_all_tauri_knowledge");
      setItems(list);
      const tools = await invoke<McpToolInfo[]>("list_mcp_tools");
      setMcpTools(tools);
    } catch (err) {
      console.error("Failed loading knowledge data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Global ESC key listener to close fullscreen dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedDashboard(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setExpandedDashboard]);

  const handleIndexWorkspace = async () => {
    if (isIndexing) return;
    setIsIndexing(true);
    try {
      const count = await invoke<number>("index_workspace_code", { workspacePath });
      setIndexedCount(count);
    } catch (err) {
      alert(`Indexing failed: ${err}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    setIsSearchingSemantic(true);
    try {
      const results = await invoke<any[]>("semantic_search_code", {
        query: semanticQuery.trim(),
        limit: 10,
      });
      setSemanticResults(results || []);
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.solution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const errorItems = items.filter((i) => i.category === "compiler_errors");

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setExpandedDashboard(null);
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150 ${
        isMaximized ? "p-0" : "p-6"
      }`}
    >
      <div
        className={`${
          isMaximized
            ? "w-full h-full rounded-none border-0"
            : "w-full max-w-5xl h-[88vh] rounded-lg border border-vsc-border"
        } bg-vsc-bg shadow-2xl flex flex-col overflow-hidden text-vsc-text`}
      >
        {/* Top Header */}
        <div className="h-14 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-purple-600/20 text-purple-400 flex items-center justify-center text-lg">
              <VscBook />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Offline Tauri Knowledge Base & MCP Hub
              </h2>
              <p className="text-[11px] text-gray-400">
                100% offline knowledge base, compiler error playbook, codebase semantic indexing, and MCP tools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? "Restore Modal" : "Full Screen"}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              {isMaximized ? <VscChromeRestore className="text-sm" /> : <VscChromeMaximize className="text-sm" />}
            </button>
            <button
              onClick={() => setExpandedDashboard(null)}
              title="Close (Esc)"
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <VscClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="h-10 px-6 border-b border-vsc-border flex items-center justify-between bg-vsc-sidebar/50 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("playbook")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "playbook"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Tauri Architecture Playbook ({items.length - errorItems.length})
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "errors"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Compiler Error Solutions ({errorItems.length})
            </button>
            <button
              onClick={() => setActiveTab("index")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "index"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Workspace Semantic Index
            </button>
            <button
              onClick={() => setActiveTab("mcp")}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                activeTab === "mcp"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Active MCP Tools ({mcpTools.length})
            </button>
          </div>

          <span className="text-[11px] text-gray-500 font-mono">
            SQLite: ~/.code-lite/tauri_knowledge.db
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: TAURI ARCHITECTURE PLAYBOOK */}
          {activeTab === "playbook" && (
            <div className="space-y-5">
              {/* Search & Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-80">
                  <VscSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recipes, state, ipc, window..."
                    className="w-full bg-vsc-sidebar border border-vsc-border rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selectedCategory === c.id
                          ? "bg-blue-600 text-white font-medium"
                          : "bg-vsc-sidebar text-gray-400 hover:text-white border border-vsc-border"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipes Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems
                  .filter((i) => i.category !== "compiler_errors")
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 hover:border-gray-600 transition-colors flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono flex-shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="mt-3 text-xs text-gray-300 space-y-1">
                          <div className="text-[11px] font-semibold text-blue-400">
                            Recommended Pattern:
                          </div>
                          <p className="text-[11px] text-gray-300 leading-relaxed bg-black/20 p-2 rounded border border-gray-800">
                            {item.solution}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-vsc-border">
                        <div className="relative rounded bg-black/40 border border-gray-800 p-2.5 overflow-x-auto">
                          <button
                            onClick={() => handleCopyCode(item.id, item.code_snippet)}
                            className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Copy code snippet"
                          >
                            {copiedId === item.id ? <VscCheck className="text-green-400" /> : <VscCopy />}
                          </button>
                          <pre className="font-mono text-[10px] text-gray-300">
                            {item.code_snippet}
                          </pre>
                        </div>

                        <button
                          onClick={() => {
                            setExpandedDashboard(null);
                            if (!isPanelOpen) togglePanel();
                          }}
                          className="w-full py-1.5 rounded bg-vsc-sidebar hover:bg-white/10 border border-vsc-border text-gray-300 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <VscSparkle className="text-yellow-300" />
                          <span>Ask Coding Agent to Implement Pattern</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: COMPILER ERROR PLAYBOOK */}
          {activeTab === "errors" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-950/20 text-xs text-yellow-200">
                Common Rust compiler errors, borrow checker dilemmas, and linker gotchas diagnosed with exact solutions.
              </div>

              <div className="space-y-4">
                {errorItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <VscWarning className="text-yellow-400 text-base" />
                        <h3 className="text-sm font-semibold text-white font-mono">{item.title}</h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 font-mono">
                        Compiler Diagnostics
                      </span>
                    </div>

                    <p className="text-xs text-gray-300">{item.description}</p>

                    <div className="text-xs text-gray-300 space-y-1">
                      <span className="font-semibold text-green-400">Diagnosis & Fix:</span>
                      <p className="text-[11px] text-gray-300 leading-relaxed bg-black/20 p-2.5 rounded border border-gray-800">
                        {item.solution}
                      </p>
                    </div>

                    <div className="relative rounded bg-black/40 border border-gray-800 p-3 overflow-x-auto">
                      <button
                        onClick={() => handleCopyCode(item.id, item.code_snippet)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Copy code snippet"
                      >
                        {copiedId === item.id ? <VscCheck className="text-green-400" /> : <VscCopy />}
                      </button>
                      <pre className="font-mono text-[11px] text-gray-300">
                        {item.code_snippet}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE SEMANTIC INDEX */}
          {activeTab === "index" && (
            <div className="max-w-2xl mx-auto py-4 space-y-6">
              <div className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <VscDatabase className="text-blue-400" />
                      <span>Workspace Codebase Semantic Index</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Walks `.rs`, `.ts`, `.tsx`, `.js`, and `.json` files in your active workspace and indexes logical code chunks in SQLite.
                    </p>
                  </div>

                  <button
                    onClick={handleIndexWorkspace}
                    disabled={isIndexing}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <VscRefresh className={isIndexing ? "animate-spin" : ""} />
                    <span>{isIndexing ? "Indexing..." : "Index Workspace Now"}</span>
                  </button>
                </div>

                {indexedCount !== null && (
                  <div className="text-xs text-green-400 flex items-center gap-1.5 font-medium pt-1">
                    <VscCheck /> Successfully indexed {indexedCount} code snippets into SQLite
                  </div>
                )}
              </div>

              {/* Semantic Search Tester */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-300">Test Semantic Retrieval</h4>
                <form onSubmit={handleSemanticSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={semanticQuery}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    placeholder="Enter concept (e.g. 'terminal profiles' or 'window drag')..."
                    className="flex-1 bg-vsc-sidebar border border-vsc-border rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingSemantic}
                    className="px-4 py-1.5 rounded bg-gray-700 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                  >
                    Search
                  </button>
                </form>

                {semanticResults.length > 0 && (
                  <div className="space-y-2">
                    {semanticResults.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded border border-vsc-border bg-vsc-sidebar/30 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-blue-400">
                          <span>{r.relative_path}:{r.line_number}</span>
                          <span className="text-gray-500 text-[10px]">Score: {r.score}</span>
                        </div>
                        <pre className="font-mono text-[10px] text-gray-300 bg-black/30 p-2 rounded overflow-x-auto">
                          {r.snippet}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE MCP TOOLS */}
          {activeTab === "mcp" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <VscPlug className="text-green-400" />
                    <span>Model Context Protocol (MCP) Integration</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tools discovered from local MCP servers and built-in offline providers
                  </p>
                </div>

                <span className="text-[11px] text-gray-500 font-mono">
                  ~/.code-lite/mcp_config.json
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mcpTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 rounded-lg border border-vsc-border bg-vsc-sidebar/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm text-white">
                        {tool.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono">
                        {tool.server_name}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">{tool.description}</p>

                    {tool.parameters && (
                      <div className="pt-2 border-t border-gray-800">
                        <span className="text-[10px] text-gray-500 font-mono">Parameters:</span>
                        <pre className="text-[10px] font-mono text-gray-300 bg-black/20 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

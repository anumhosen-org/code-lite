import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  VscBook,
  VscSearch,
  VscRefresh,
  VscCheck,
  VscChevronDown,
  VscChevronRight,
  VscCopy,
  VscSparkle,
  VscScreenFull,
} from "react-icons/vsc";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAgentStore } from "../../store/agentStore";
import { useLocalAiStore } from "../../store/localAiStore";

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
}

export const KnowledgeSidebarView: React.FC = () => {
  const { workspacePath } = useWorkspaceStore();
  const { togglePanel, isPanelOpen } = useAgentStore();
  const { setExpandedDashboard } = useLocalAiStore();

  const [activeTab, setActiveTab] = useState<"recipes" | "mcp">("recipes");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [mcpTools, setMcpTools] = useState<McpToolInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const categories = [
    { id: "all", label: "All" },
    { id: "compiler_errors", label: "Errors" },
    { id: "state_management", label: "State" },
    { id: "ipc_commands", label: "IPC" },
    { id: "tauri_architecture", label: "Architecture" },
  ];

  const loadKnowledge = async () => {
    try {
      const list = await invoke<KnowledgeItem[]>("list_all_tauri_knowledge");
      setItems(list);
      const tools = await invoke<McpToolInfo[]>("list_mcp_tools");
      setMcpTools(tools);
    } catch (err) {
      console.error("Failed loading knowledge:", err);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  const handleIndexWorkspace = async () => {
    if (isIndexing) return;
    setIsIndexing(true);
    try {
      const count = await invoke<number>("index_workspace_code", {
        workspacePath,
      });
      setIndexedCount(count);
    } catch (err) {
      alert(`Indexing failed: ${err}`);
    } finally {
      setIsIndexing(false);
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
      item.tags.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-vsc-sidebar text-vsc-text select-none text-xs">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-vsc-border font-semibold uppercase tracking-wider text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <VscBook className="text-purple-400" />
          <span>Knowledge & MCP</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadKnowledge}
            title="Refresh knowledge base"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <VscRefresh />
          </button>
          <button
            onClick={() => setExpandedDashboard("knowledge")}
            title="Open Full Knowledge Dashboard"
            className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <VscScreenFull />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-vsc-border flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setActiveTab("recipes")}
          className={`flex-1 py-1 rounded font-medium transition-colors ${
            activeTab === "recipes"
              ? "bg-blue-600 text-white"
              : "bg-vsc-bg text-gray-400 hover:text-white"
          }`}
        >
          Tauri Playbook ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("mcp")}
          className={`flex-1 py-1 rounded font-medium transition-colors ${
            activeTab === "mcp"
              ? "bg-blue-600 text-white"
              : "bg-vsc-bg text-gray-400 hover:text-white"
          }`}
        >
          MCP & Vector RAG
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === "recipes" && (
          <>
            {/* Search Input */}
            <div className="relative">
              <VscSearch className="absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Tauri recipes, errors..."
                className="w-full bg-vsc-bg border border-vsc-border rounded pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-vsc-bg text-gray-400 hover:text-white border border-vsc-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Knowledge Cards List */}
            <div className="space-y-2 pt-1">
              {filteredItems.map((item) => {
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded border border-vsc-border bg-vsc-bg/50 hover:border-gray-600 transition-colors space-y-1.5"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-start justify-between cursor-pointer gap-2"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">
                          {isExpanded ? <VscChevronDown /> : <VscChevronRight />}
                        </span>
                        <div>
                          <div className="font-medium text-gray-200 text-[11px] leading-tight">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded font-mono flex-shrink-0">
                        {item.category}
                      </span>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-gray-800 space-y-2">
                        <div>
                          <div className="text-[10px] font-semibold text-blue-400 mb-0.5">
                            Solution Pattern
                          </div>
                          <p className="text-[10px] text-gray-300 leading-relaxed">
                            {item.solution}
                          </p>
                        </div>

                        {/* Code Snippet Box */}
                        <div className="relative rounded bg-black/40 border border-gray-800 p-2 overflow-x-auto">
                          <button
                            onClick={() => handleCopyCode(item.id, item.code_snippet)}
                            className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {copiedId === item.id ? <VscCheck className="text-green-400" /> : <VscCopy />}
                          </button>
                          <pre className="font-mono text-[10px] text-gray-300">
                            {item.code_snippet}
                          </pre>
                        </div>

                        {/* Ask Agent button */}
                        <button
                          onClick={() => {
                            if (!isPanelOpen) togglePanel();
                          }}
                          className="w-full py-1 rounded bg-vsc-sidebar hover:bg-white/10 border border-vsc-border text-gray-300 hover:text-white text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <VscSparkle className="text-yellow-300" />
                          <span>Ask Coding Agent about this pattern</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: MCP & VECTOR RAG */}
        {activeTab === "mcp" && (
          <div className="space-y-4">
            {/* Workspace Codebase Indexer */}
            <div className="p-3 rounded-lg border border-vsc-border bg-vsc-bg/50 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                <VscSparkle />
                <span>Codebase Semantic Index</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Index source files in your active workspace for vector-like semantic code search and context retrieval.
              </p>

              {indexedCount !== null && (
                <div className="text-[10px] text-green-400 flex items-center gap-1">
                  <VscCheck /> {indexedCount} code chunks indexed in SQLite
                </div>
              )}

              <button
                onClick={handleIndexWorkspace}
                disabled={isIndexing}
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <VscRefresh className={isIndexing ? "animate-spin" : ""} />
                <span>{isIndexing ? "Indexing Codebase..." : "Index Workspace Code"}</span>
              </button>
            </div>

            {/* Model Context Protocol (MCP) Tools */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                <span>ACTIVE MCP TOOLS ({mcpTools.length})</span>
              </div>

              <div className="space-y-1.5">
                {mcpTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-2 rounded border border-vsc-border bg-vsc-bg/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-gray-200 text-[11px]">
                        {tool.name}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                        {tool.server_name}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {tool.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-2 rounded bg-gray-900/40 border border-gray-800 text-[10px] text-gray-500 font-mono">
                Configuration: ~/.code-lite/mcp_config.json
              </div>
            </div>
          </div>
        )}

        {/* Open Full Dashboard Button */}
        <button
          onClick={() => setExpandedDashboard("knowledge")}
          className="w-full py-1.5 px-2 rounded border border-vsc-border bg-vsc-bg hover:bg-white/5 text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <VscScreenFull />
          <span>Open Full Knowledge Dashboard</span>
        </button>
      </div>
    </div>
  );
};

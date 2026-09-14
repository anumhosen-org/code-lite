import React, { useState } from "react";
import {
  VscCaseSensitive,
  VscRegex,
  VscChevronRight,
  VscChevronDown,
  VscFileCode,
} from "react-icons/vsc";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useEditorStore } from "../../store/editorStore";
import { searchService } from "../../services/tauri/search";
import { SearchMatch } from "../../types";

export const SearchSidebar: React.FC = () => {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const openFile = useEditorStore((s) => s.openFile);

  const [query, setQuery] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fileFilter, setFileFilter] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || !workspacePath) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const matches = await searchService.searchInWorkspace(
        workspacePath,
        query,
        isRegex,
        caseSensitive,
        fileFilter || undefined,
        150
      );
      setResults(matches);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Group matches by file_path
  const groupedResults = results.reduce<Record<string, SearchMatch[]>>((acc, match) => {
    if (!acc[match.file_path]) {
      acc[match.file_path] = [];
    }
    acc[match.file_path].push(match);
    return acc;
  }, {});

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-vsc-sidebar text-vsc-text select-none text-xs">
      {/* Top Search Header */}
      <div className="h-9 px-3 flex items-center justify-between font-semibold tracking-wider text-[11px] text-gray-400 border-b border-vsc-border">
        <span>SEARCH</span>
      </div>

      {/* Search Input Controls */}
      <form onSubmit={handleSearch} className="p-3 flex flex-col gap-2 border-b border-vsc-border">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search in workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-vsc-bg border border-vsc-border rounded px-2 py-1 pr-14 text-xs text-white outline-none focus:border-blue-500"
          />
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Match Case (Alt+C)"
              className={`p-1 rounded text-xs transition-colors ${
                caseSensitive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <VscCaseSensitive />
            </button>
            <button
              type="button"
              onClick={() => setIsRegex(!isRegex)}
              title="Use Regular Expression (Alt+R)"
              className={`p-1 rounded text-xs transition-colors ${
                isRegex ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <VscRegex />
            </button>
          </div>
        </div>

        {/* File Filter Input */}
        <div>
          <input
            type="text"
            placeholder="files to include (e.g. *.ts, src/)"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            className="w-full bg-vsc-bg border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-1 rounded text-xs font-medium transition-colors"
        >
          {isSearching ? "Searching..." : "Find"}
        </button>
      </form>

      {/* Results Header */}
      <div className="px-3 py-1.5 text-[11px] text-gray-400 bg-vsc-bg/40 border-b border-vsc-border">
        {hasSearched ? (
          <span>
            {results.length} results in {Object.keys(groupedResults).length} files
          </span>
        ) : (
          <span>Enter search term</span>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {Object.entries(groupedResults).map(([filePath, matches]) => {
          const isCollapsed = collapsedFiles.has(filePath);
          const fileName = filePath.split(/[/\\]/).pop() || filePath;
          const relativePath = matches[0]?.relative_path || filePath;

          return (
            <div key={filePath} className="mb-1">
              {/* File Header */}
              <div
                onClick={() => toggleFileCollapse(filePath)}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-vsc-hover cursor-pointer text-gray-300 hover:text-white"
              >
                <span className="text-gray-400 text-xs">
                  {isCollapsed ? <VscChevronRight /> : <VscChevronDown />}
                </span>
                <VscFileCode className="text-blue-400 text-xs flex-shrink-0" />
                <span className="font-semibold text-xs truncate">{fileName}</span>
                <span className="text-gray-500 text-[10px] truncate ml-1">
                  {relativePath}
                </span>
                <span className="ml-auto text-[10px] bg-vsc-hover px-1.5 rounded-full text-gray-400">
                  {matches.length}
                </span>
              </div>

              {/* Match Items */}
              {!isCollapsed && (
                <div className="pl-6 pr-2">
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => openFile(m.file_path)}
                      className="py-1 px-1.5 hover:bg-vsc-hover rounded cursor-pointer flex items-baseline gap-2 text-xs transition-colors"
                    >
                      <span className="text-blue-400 text-[11px] font-mono flex-shrink-0">
                        {m.line_number}:
                      </span>
                      <span className="truncate text-gray-300 font-mono text-[11px]">
                        {m.line_content.trim()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

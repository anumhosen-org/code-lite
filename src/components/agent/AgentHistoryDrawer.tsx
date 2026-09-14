import React, { useState } from "react";
import {
  VscClose,
  VscAdd,
  VscSearch,
  VscEdit,
  VscTrash,
  VscCheck,
  VscHistory,
  VscSparkle,
} from "react-icons/vsc";
import { useAgentStore, SessionSummary } from "../../store/agentStore";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function groupSessions(sessions: SessionSummary[]): { [group: string]: SessionSummary[] } {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const groups: { [group: string]: SessionSummary[] } = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const session of sessions) {
    const diff = now - session.updated_at;
    if (diff < oneDay) {
      groups["Today"].push(session);
    } else if (diff < 2 * oneDay) {
      groups["Yesterday"].push(session);
    } else if (diff < 7 * oneDay) {
      groups["Previous 7 Days"].push(session);
    } else {
      groups["Older"].push(session);
    }
  }

  return groups;
}

export const AgentHistoryDrawer: React.FC = () => {
  const {
    isHistoryDrawerOpen,
    setIsHistoryDrawerOpen,
    workspaceSessions,
    currentSessionId,
    switchSession,
    createNewSession,
    deleteSession,
    renameSession,
  } = useAgentStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  if (!isHistoryDrawerOpen) return null;

  const filteredSessions = workspaceSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.last_message_preview &&
        s.last_message_preview.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const grouped = groupSessions(filteredSessions);

  const handleStartRename = (session: SessionSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete session "${title}"?`)) {
      deleteSession(sessionId);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-vsc-sidebar border-r border-vsc-border animate-in slide-in-from-left duration-150 select-none">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-vsc-border bg-vsc-activity flex-shrink-0">
        <div className="flex items-center gap-2">
          <VscHistory className="text-blue-400 text-sm" />
          <span className="font-semibold text-gray-200 text-xs tracking-wider">
            CHAT HISTORY
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            ({workspaceSessions.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => createNewSession()}
            title="Start New Conversation"
            className="p-1 hover:bg-vsc-hover rounded text-gray-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
          >
            <VscAdd className="text-sm text-blue-400" />
            <span className="text-[11px] font-medium">New</span>
          </button>
          <button
            onClick={() => setIsHistoryDrawerOpen(false)}
            title="Close History Drawer"
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white transition-colors"
          >
            <VscClose className="text-sm" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-vsc-border/60 bg-vsc-bg/40">
        <div className="relative">
          <VscSearch className="absolute left-2.5 top-2 text-gray-500 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past conversations..."
            className="w-full bg-vsc-bg border border-vsc-border rounded pl-8 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 space-y-2">
            <VscSparkle className="mx-auto text-xl text-gray-600" />
            <p className="text-xs">No conversations found</p>
            <p className="text-[10px]">
              Conversations in this workspace are automatically saved in SQLite.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, list]) => {
            if (list.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {groupTitle}
                </div>

                <div className="space-y-1">
                  {list.map((session) => {
                    const isActive = session.id === currentSessionId;
                    const isEditing = editingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (!isEditing) switchSession(session.id);
                        }}
                        className={`group relative p-2 rounded border transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-950/40 border-blue-500/50 text-white"
                            : "bg-vsc-bg/40 border-vsc-border hover:bg-vsc-hover hover:border-gray-600 text-gray-300"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500 rounded-r" />
                        )}

                        <div className="flex items-start justify-between gap-1">
                          {isEditing ? (
                            <form
                              onSubmit={(e) => handleSaveRename(session.id, e)}
                              className="flex items-center gap-1 flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setEditingSessionId(null);
                                }}
                                className="w-full bg-vsc-sidebar border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <VscCheck />
                              </button>
                            </form>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate pr-14 leading-tight">
                                {session.title}
                              </div>
                              {session.last_message_preview && (
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                  {session.last_message_preview}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Hover action buttons */}
                          {!isEditing && (
                            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleStartRename(session, e)}
                                title="Rename session"
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                              >
                                <VscEdit className="text-xs" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(session.id, session.title, e)}
                                title="Delete session"
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"
                              >
                                <VscTrash className="text-xs" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5 pt-1 border-t border-white/5">
                          <span className="font-mono">
                            {formatRelativeTime(session.updated_at)}
                          </span>
                          <span className="font-mono">
                            {session.message_count} msg{session.message_count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

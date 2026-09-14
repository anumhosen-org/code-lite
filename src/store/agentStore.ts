import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "./workspaceStore";
import { useSettingsStore } from "./settingsStore";

export interface ToolCallItem {
  id: string;
  name: string;
  args: Record<string, any>;
  output?: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string;
  toolCalls?: ToolCallItem[];
  timestamp: number;
}

export interface PendingDiff {
  id: string;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  toolCallId: string;
  status: "pending" | "accepted" | "rejected";
}

export interface SessionSummary {
  id: string;
  workspace_path: string;
  title: string;
  created_at: number;
  updated_at: number;
  model: string;
  mode: string;
  message_count: number;
  last_message_preview?: string | null;
}

interface AgentMessageRecord {
  id: string;
  session_id: string;
  role: string;
  content: string;
  thought?: string | null;
  tool_calls_json?: string | null;
  timestamp: number;
}

interface AgentState {
  isPanelOpen: boolean;
  isRunning: boolean;
  autoApply: boolean;
  agentMode: "agent" | "planning";
  currentSessionId: string | null;
  currentSessionTitle: string;
  isHistoryDrawerOpen: boolean;
  workspaceSessions: SessionSummary[];
  messages: AgentMessage[];
  pendingDiffs: PendingDiff[];

  // Actions
  togglePanel: () => void;
  setIsPanelOpen: (open: boolean) => void;
  setIsRunning: (running: boolean) => void;
  setAutoApply: (autoApply: boolean) => void;
  setAgentMode: (mode: "agent" | "planning") => void;
  toggleHistoryDrawer: () => void;
  setIsHistoryDrawerOpen: (open: boolean) => void;
  setCurrentSessionTitle: (title: string) => void;

  addMessage: (msg: Omit<AgentMessage, "id" | "timestamp">) => string;
  updateMessage: (id: string, update: Partial<AgentMessage>) => void;
  addToolCallToMessage: (messageId: string, toolCall: ToolCallItem) => void;
  updateToolCall: (
    messageId: string,
    toolCallId: string,
    update: Partial<ToolCallItem>
  ) => void;
  addPendingDiff: (diff: Omit<PendingDiff, "status">) => void;
  resolvePendingDiff: (id: string, status: "accepted" | "rejected") => void;
  clearChat: () => void;

  // Session & Workspace History Actions
  loadWorkspaceSessions: (workspacePath?: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  createNewSession: (title?: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
}

const DEFAULT_WELCOME_MESSAGE: AgentMessage = {
  id: "initial-welcome",
  role: "assistant",
  content: "How can I help you build today?",
  timestamp: Date.now(),
};

export const useAgentStore = create<AgentState>((set, get) => ({
  isPanelOpen: true,
  isRunning: false,
  autoApply: false,
  agentMode: "agent",
  currentSessionId: null,
  currentSessionTitle: "New Session",
  isHistoryDrawerOpen: false,
  workspaceSessions: [],
  messages: [DEFAULT_WELCOME_MESSAGE],
  pendingDiffs: [],

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setIsPanelOpen: (isPanelOpen: boolean) => set({ isPanelOpen }),
  setIsRunning: (isRunning: boolean) => {
    set({ isRunning });
    // Auto-save on run stop
    if (!isRunning) {
      get().saveCurrentSession().catch(console.error);
    }
  },
  setAutoApply: (autoApply: boolean) => set({ autoApply }),
  setAgentMode: (agentMode: "agent" | "planning") => {
    set({ agentMode });
    get().saveCurrentSession().catch(console.error);
  },
  toggleHistoryDrawer: () =>
    set((state) => ({ isHistoryDrawerOpen: !state.isHistoryDrawerOpen })),
  setIsHistoryDrawerOpen: (isHistoryDrawerOpen: boolean) =>
    set({ isHistoryDrawerOpen }),
  setCurrentSessionTitle: (currentSessionTitle: string) =>
    set({ currentSessionTitle }),

  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const currentId = get().currentSessionId;
    let newSessionId = currentId;

    if (!newSessionId) {
      newSessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }

    let currentTitle = get().currentSessionTitle;
    if (
      msg.role === "user" &&
      (currentTitle === "New Session" || !currentTitle.trim())
    ) {
      currentTitle = msg.content.trim().slice(0, 36).replace(/[\r\n]+/g, " ");
      if (msg.content.trim().length > 36) currentTitle += "...";
    }

    set((state) => ({
      currentSessionId: newSessionId,
      currentSessionTitle: currentTitle,
      messages: [
        ...state.messages,
        {
          ...msg,
          id,
          timestamp: Date.now(),
        },
      ],
    }));

    return id;
  },

  updateMessage: (id, update) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...update } : m
      ),
    }));
  },

  addToolCallToMessage: (messageId, toolCall) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentCalls = m.toolCalls || [];
        return {
          ...m,
          toolCalls: [...currentCalls, toolCall],
        };
      }),
    }));
  },

  updateToolCall: (messageId, toolCallId, update) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const updatedCalls = (m.toolCalls || []).map((t) =>
          t.id === toolCallId ? { ...t, ...update } : t
        );
        return { ...m, toolCalls: updatedCalls };
      }),
    }));
  },

  addPendingDiff: (diff) => {
    set((state) => ({
      pendingDiffs: [
        ...state.pendingDiffs.filter((d) => d.filePath !== diff.filePath),
        { ...diff, status: "pending" },
      ],
    }));
  },

  resolvePendingDiff: (id, status) => {
    set((state) => ({
      pendingDiffs: state.pendingDiffs.map((d) =>
        d.id === id ? { ...d, status } : d
      ),
    }));
  },

  clearChat: () => {
    const freshId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set({
      currentSessionId: freshId,
      currentSessionTitle: "New Session",
      messages: [DEFAULT_WELCOME_MESSAGE],
      pendingDiffs: [],
      isRunning: false,
    });
  },

  loadWorkspaceSessions: async (workspacePath?: string) => {
    try {
      const ws = workspacePath ?? useWorkspaceStore.getState().workspacePath;
      if (!ws) return;

      const sessions = await invoke<SessionSummary[]>("list_workspace_sessions", {
        workspacePath: ws,
      });

      set({ workspaceSessions: sessions || [] });

      // If we don't have an active session or the active session is not from this workspace, load latest
      const current = get().currentSessionId;
      const sessionExistsInWorkspace = sessions.some((s) => s.id === current);

      if (!sessionExistsInWorkspace && sessions.length > 0) {
        await get().switchSession(sessions[0].id);
      } else if (!current) {
        // Initialize fresh session
        const freshId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        set({
          currentSessionId: freshId,
          currentSessionTitle: "New Session",
          messages: [DEFAULT_WELCOME_MESSAGE],
        });
      }
    } catch (err) {
      console.error("Failed loading workspace sessions:", err);
    }
  },

  switchSession: async (sessionId: string) => {
    try {
      // Save existing session if it has messages
      await get().saveCurrentSession();

      const records = await invoke<AgentMessageRecord[]>("get_session_messages", {
        sessionId,
      });

      const session = get().workspaceSessions.find((s) => s.id === sessionId);

      const parsedMessages: AgentMessage[] = records.map((r) => {
        let toolCalls: ToolCallItem[] | undefined;
        if (r.tool_calls_json) {
          try {
            toolCalls = JSON.parse(r.tool_calls_json);
          } catch {
            toolCalls = undefined;
          }
        }
        const isLegacyWelcome =
          r.id === "initial-welcome" ||
          r.content.startsWith("Hello! I am your **Code Lite Autonomous Agent**");
        return {
          id: r.id,
          role: r.role as any,
          content: isLegacyWelcome ? "How can I help you build today?" : r.content,
          thought: r.thought || undefined,
          toolCalls,
          timestamp: r.timestamp,
        };
      });

      set({
        currentSessionId: sessionId,
        currentSessionTitle: session?.title || "Session",
        agentMode: (session?.mode as any) || "agent",
        messages: parsedMessages.length > 0 ? parsedMessages : [DEFAULT_WELCOME_MESSAGE],
        isHistoryDrawerOpen: false,
      });
    } catch (err) {
      console.error("Failed switching session:", err);
    }
  },

  createNewSession: async (title?: string) => {
    // Save current active session
    await get().saveCurrentSession();

    const freshId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sessionTitle = title || "New Session";

    set({
      currentSessionId: freshId,
      currentSessionTitle: sessionTitle,
      messages: [DEFAULT_WELCOME_MESSAGE],
      pendingDiffs: [],
      isHistoryDrawerOpen: false,
    });
  },

  saveCurrentSession: async () => {
    const { currentSessionId, currentSessionTitle, messages, agentMode } = get();
    if (!currentSessionId) return;

    // Filter out lone initial welcome message if no other interactions
    const meaningfulMessages = messages.filter((m) => m.id !== "initial-welcome");
    if (meaningfulMessages.length === 0) return;

    const ws = useWorkspaceStore.getState().workspacePath || "C:/";
    const activeProvider = useSettingsStore.getState().activeProvider;
    const model =
      useSettingsStore.getState().providers[activeProvider]?.model || "unknown";

    const records: AgentMessageRecord[] = messages.map((m) => ({
      id: m.id,
      session_id: currentSessionId,
      role: m.role,
      content: m.content,
      thought: m.thought || null,
      tool_calls_json: m.toolCalls ? JSON.stringify(m.toolCalls) : null,
      timestamp: m.timestamp,
    }));

    try {
      await invoke("save_workspace_session", {
        payload: {
          id: currentSessionId,
          workspace_path: ws,
          title: currentSessionTitle,
          model,
          mode: agentMode,
          messages: records,
        },
      });

      // Refresh session summaries
      const sessions = await invoke<SessionSummary[]>("list_workspace_sessions", {
        workspacePath: ws,
      });
      set({ workspaceSessions: sessions || [] });
    } catch (err) {
      console.error("Failed saving workspace session:", err);
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await invoke("delete_workspace_session", { sessionId });
      const ws = useWorkspaceStore.getState().workspacePath || "C:/";
      const sessions = await invoke<SessionSummary[]>("list_workspace_sessions", {
        workspacePath: ws,
      });
      set({ workspaceSessions: sessions || [] });

      if (get().currentSessionId === sessionId) {
        if (sessions.length > 0) {
          await get().switchSession(sessions[0].id);
        } else {
          await get().createNewSession();
        }
      }
    } catch (err) {
      console.error("Failed deleting session:", err);
    }
  },

  renameSession: async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await invoke("rename_workspace_session", {
        sessionId,
        newTitle: newTitle.trim(),
      });

      if (get().currentSessionId === sessionId) {
        set({ currentSessionTitle: newTitle.trim() });
      }

      const ws = useWorkspaceStore.getState().workspacePath || "C:/";
      const sessions = await invoke<SessionSummary[]>("list_workspace_sessions", {
        workspacePath: ws,
      });
      set({ workspaceSessions: sessions || [] });
    } catch (err) {
      console.error("Failed renaming session:", err);
    }
  },
}));

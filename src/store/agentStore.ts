import { create } from "zustand";

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

interface AgentState {
  isPanelOpen: boolean;
  isRunning: boolean;
  autoApply: boolean;
  messages: AgentMessage[];
  pendingDiffs: PendingDiff[];
  togglePanel: () => void;
  setIsPanelOpen: (open: boolean) => void;
  setIsRunning: (running: boolean) => void;
  setAutoApply: (autoApply: boolean) => void;
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
}

export const useAgentStore = create<AgentState>((set) => ({
  isPanelOpen: true,
  isRunning: false,
  autoApply: false,
  messages: [
    {
      id: "initial-welcome",
      role: "assistant",
      content:
        "Hello! I am your **Code Lite Autonomous Agent**. I can explore your workspace, read files, search with ripgrep, edit code with visual diffs, and run terminal commands. How can I help you build today?",
      timestamp: Date.now(),
    },
  ],
  pendingDiffs: [],

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setIsPanelOpen: (isPanelOpen: boolean) => set({ isPanelOpen }),
  setIsRunning: (isRunning: boolean) => set({ isRunning }),
  setAutoApply: (autoApply: boolean) => set({ autoApply }),

  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
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
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
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
    set({
      messages: [],
      pendingDiffs: [],
      isRunning: false,
    });
  },
}));

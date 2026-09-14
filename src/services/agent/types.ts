export interface AgentToolParam {
  type: string;
  description: string;
  enum?: string[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AgentToolParam>;
    required?: string[];
  };
}

export interface ToolCallData {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMStreamEvent {
  type: "thought" | "text" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: ToolCallData;
  error?: string;
}

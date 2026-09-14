import { LLMStreamEvent, ToolCallData } from "../types";
import { AGENT_TOOLS } from "../tools/registry";
import { ProviderConfig } from "../../../store/settingsStore";

export async function* streamAnthropic(
  messages: Array<{ role: string; content: string }>,
  config: ProviderConfig
): AsyncGenerator<LLMStreamEvent> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/messages`;

  const toolsPayload = AGENT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  // Separate system prompt if present
  let systemPrompt = "";
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
      tools: toolsPayload,
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    yield { type: "error", error: `Anthropic returned ${response.status}: ${text}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Response body is not readable." };
    return;
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentToolCall: { id: string; name: string; inputRaw: string } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataStr = trimmed.replace(/^data:\s*/, "");

      try {
        const event = JSON.parse(dataStr);
        if (event.type === "content_block_start") {
          if (event.content_block?.type === "tool_use") {
            currentToolCall = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputRaw: "",
            };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta?.type === "text_delta") {
            yield { type: "text", content: event.delta.text };
          } else if (event.delta?.type === "input_json_delta" && currentToolCall) {
            currentToolCall.inputRaw += event.delta.partial_json;
          } else if (event.delta?.type === "thinking_delta") {
            yield { type: "thought", content: event.delta.thinking };
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolCall) {
            let parsedArgs = {};
            try {
              parsedArgs = JSON.parse(currentToolCall.inputRaw || "{}");
            } catch {
              parsedArgs = { raw: currentToolCall.inputRaw };
            }
            const toolCallData: ToolCallData = {
              id: currentToolCall.id,
              name: currentToolCall.name,
              arguments: parsedArgs,
            };
            yield { type: "tool_call", toolCall: toolCallData };
            currentToolCall = null;
          }
        }
      } catch {
        // Skip malformed chunk
      }
    }
  }

  yield { type: "done" };
}

import { LLMStreamEvent, ToolCallData } from "../types";
import { AGENT_TOOLS } from "../tools/registry";
import { ProviderConfig } from "../../../store/settingsStore";

const VALID_TOOLS = new Set(AGENT_TOOLS.map((t) => t.name));

/**
 * Parses inline tool calls from text when small local models fail to emit
 * OpenAI-format delta.tool_calls packets.
 */
function extractInlineToolCalls(text: string): {
  toolCalls: ToolCallData[];
  cleanedText: string;
} {
  const toolCalls: ToolCallData[] = [];
  let cleaned = text;

  // Pattern 1: <tool_call> ... </tool_call>
  const tagRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      if (name && VALID_TOOLS.has(name)) {
        toolCalls.push({
          id: `inline-${Date.now()}-${toolCalls.length}`,
          name,
          arguments: parsed.arguments || parsed.args || {},
        });
        cleaned = cleaned.replace(match[0], "");
      }
    } catch {
      // Ignore malformed JSON inside tag
    }
  }

  // Pattern 2: Markdown fenced json blocks containing tool invocations
  const codeBlockRegex = /```(?:json)?\s*(\{\s*"(?:name|tool)"\s*:\s*"([^"]+)"[\s\S]*?\})\s*```/gi;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      if (name && VALID_TOOLS.has(name)) {
        toolCalls.push({
          id: `inline-${Date.now()}-${toolCalls.length}`,
          name,
          arguments: parsed.arguments || parsed.args || {},
        });
        cleaned = cleaned.replace(match[0], "");
      }
    } catch {
      // Ignore non-matching codeblock
    }
  }

  // Pattern 3: Raw JSON objects with "name" and "arguments" on standalone or bulleted lines
  const rawJsonRegex = /(\{\s*"(?:name|tool)"\s*:\s*"([a-zA-Z0-9_]+)"\s*,\s*"(?:arguments|args)"\s*:\s*\{[\s\S]*?\}\s*\})/gi;
  while ((match = rawJsonRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      if (name && VALID_TOOLS.has(name)) {
        const alreadyFound = toolCalls.some(
          (t) => t.name === name && JSON.stringify(t.arguments) === JSON.stringify(parsed.arguments || parsed.args)
        );
        if (!alreadyFound) {
          toolCalls.push({
            id: `inline-${Date.now()}-${toolCalls.length}`,
            name,
            arguments: parsed.arguments || parsed.args || {},
          });
          cleaned = cleaned.replace(match[0], "");
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  return { toolCalls, cleanedText: cleaned.trim() };
}

export async function* streamOpenAICompatible(
  messages: Array<{ role: string; content: string }>,
  config: ProviderConfig
): AsyncGenerator<LLMStreamEvent> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const toolsPayload = AGENT_TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: toolsPayload,
      tool_choice: "auto",
      stream: true,
      temperature: 0.2, // Low temperature for precise code & tool calling
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    yield {
      type: "error",
      error: `API returned ${response.status}: ${text}`,
    };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Response body is not readable." };
    return;
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullAccumulatedText = "";
  const pendingToolCalls: Record<
    number,
    { id: string; name: string; argumentsRaw: string }
  > = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) {
        continue;
      }
      const dataStr = trimmed.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") {
        break;
      }

      try {
        const json = JSON.parse(dataStr);
        const choice = json.choices?.[0];
        if (!choice) continue;

        // Reasoning / Chain-of-thought support (e.g. DeepSeek-R1 / Qwen)
        const reasoning = choice.delta?.reasoning_content || choice.delta?.thought;
        if (reasoning) {
          yield { type: "thought", content: reasoning };
        }

        // Standard text stream
        const text = choice.delta?.content;
        if (text) {
          fullAccumulatedText += text;
          yield { type: "text", content: text };
        }

        // Native OpenAI streaming tool calls
        if (choice.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const index = tc.index ?? 0;
            if (!pendingToolCalls[index]) {
              pendingToolCalls[index] = {
                id: tc.id || `call-${Date.now()}-${index}`,
                name: tc.function?.name || "",
                argumentsRaw: "",
              };
            }
            if (tc.function?.name) {
              pendingToolCalls[index].name = tc.function.name;
            }
            if (tc.function?.arguments) {
              pendingToolCalls[index].argumentsRaw += tc.function.arguments;
            }
          }
        }
      } catch {
        // Skip malformed chunk
      }
    }
  }

  // 1. Emit native tool calls if present
  const nativeCount = Object.keys(pendingToolCalls).length;
  if (nativeCount > 0) {
    for (const index of Object.keys(pendingToolCalls)) {
      const item = pendingToolCalls[Number(index)];
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = JSON.parse(item.argumentsRaw || "{}");
      } catch {
        parsedArgs = { raw: item.argumentsRaw };
      }

      const toolCallData: ToolCallData = {
        id: item.id,
        name: item.name,
        arguments: parsedArgs,
      };
      yield { type: "tool_call", toolCall: toolCallData };
    }
  } else if (fullAccumulatedText) {
    // 2. Fallback: Parse inline tool calls from accumulated text (for small models)
    const { toolCalls } = extractInlineToolCalls(fullAccumulatedText);
    for (const tc of toolCalls) {
      yield { type: "tool_call", toolCall: tc };
    }
  }

  yield { type: "done" };
}

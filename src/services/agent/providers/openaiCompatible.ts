import { LLMStreamEvent, ToolCallData } from "../types";
import { AGENT_TOOLS } from "../tools/registry";
import { ProviderConfig } from "../../../store/settingsStore";

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

        // Reasoning/thought support (e.g. DeepSeek-R1 / Qwen)
        const reasoning = choice.delta?.reasoning_content || choice.delta?.thought;
        if (reasoning) {
          yield { type: "thought", content: reasoning };
        }

        // Standard text content
        const text = choice.delta?.content;
        if (text) {
          yield { type: "text", content: text };
        }

        // Streaming tool calls
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
      } catch (err) {
        // Skip malformed chunk
      }
    }
  }

  // Emit any complete tool calls
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

  yield { type: "done" };
}

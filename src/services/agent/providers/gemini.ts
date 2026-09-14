import { LLMStreamEvent, ToolCallData } from "../types";
import { AGENT_TOOLS } from "../tools/registry";
import { ProviderConfig } from "../../../store/settingsStore";

export async function* streamGemini(
  messages: Array<{ role: string; content: string }>,
  config: ProviderConfig
): AsyncGenerator<LLMStreamEvent> {
  const model = config.model || "gemini-2.0-flash";
  const url = `${config.baseUrl.replace(/\/+$/, "")}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

  const functionDeclarations = AGENT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemMessage = messages.find((m) => m.role === "system");

  const bodyPayload: Record<string, any> = {
    contents,
    tools: [{ functionDeclarations }],
  };

  if (systemMessage) {
    bodyPayload["systemInstruction"] = {
      parts: [{ text: systemMessage.content }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const text = await response.text();
    yield { type: "error", error: `Gemini returned ${response.status}: ${text}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "Response body is not readable." };
    return;
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

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
        const json = JSON.parse(dataStr);
        const candidate = json.candidates?.[0];
        if (!candidate) continue;

        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            yield { type: "text", content: part.text };
          }
          if (part.functionCall) {
            const toolCallData: ToolCallData = {
              id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: part.functionCall.name,
              arguments: part.functionCall.args || {},
            };
            yield { type: "tool_call", toolCall: toolCallData };
          }
        }
      } catch {
        // Skip malformed chunk
      }
    }
  }

  yield { type: "done" };
}

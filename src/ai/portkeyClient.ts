import { getConfig } from "../config.js";

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type PortkeyMessageResponse = {
  id?: string;
  type?: string;
  role?: string;
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
    | Record<string, unknown>
  >;
  stop_reason?: string;
};

export async function createClaudeMessage(params: {
  messages: AnthropicMessage[];
  tools?: unknown[];
  userId: string;
  requestId: string;
}) {
  const config = getConfig();

  if (config.aiProvider !== "portkey") {
    throw new Error("createClaudeMessage called while AI_PROVIDER is not portkey");
  }

  if (!config.portkeyApiKey) {
    throw new Error("PORTKEY_API_KEY is required when AI_PROVIDER=portkey");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.portkeyRequestTimeoutMs);

  try {
    const response = await fetch(config.portkeyBaseUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-portkey-api-key": config.portkeyApiKey,
        "x-portkey-trace-id": params.requestId,
        "x-portkey-metadata": JSON.stringify({
          _user: params.userId,
          _environment: config.nodeEnv,
          feature: "ai-vault-agent",
          request_id: params.requestId
        })
      },
      body: JSON.stringify({
        model: config.aiModel,
        max_tokens: config.aiMaxTokens,
        temperature: config.aiTemperature,
        system: undefined,
        tools: params.tools,
        messages: params.messages
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Portkey request failed ${response.status}: ${text}`);
    }

    return (await response.json()) as PortkeyMessageResponse;
  } finally {
    clearTimeout(timeout);
  }
}

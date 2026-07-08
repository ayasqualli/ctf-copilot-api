import crypto from "node:crypto";
import { getConfig } from "../config.js";
import { getDb } from "../db/db.js";
import { createToolFactory } from "../tools/toolFactory.js";
import type { ToolContext } from "../tools/ToolContext.js";
import { toolDefinitions } from "../tools/toolRegistry.js";
import { forcedErrorPath, safeParseFinalAnswer, type FinalAnswer } from "../schemas/finalAnswer.js";
import { buildUserPrompt, mockAnswer, SYSTEM_PROMPT } from "./prompts.js";
import { createClaudeMessage, type AnthropicMessage } from "./portkeyClient.js";
import { extractFirstJsonObject } from "../utils/json.js";

export async function runAskFlow(params: {
  userId: string;
  question: string;
  mode: string;
}): Promise<FinalAnswer> {
  const config = getConfig();

  if (config.aiProvider === "mock") {
    return mockAnswer(params.question);
  }

  const requestId = crypto.randomUUID();
  const ctx: ToolContext = {
    userId: params.userId,
    requestId,
    db: getDb(),
    usedTools: [],
    retrievedSources: [],
    blocked: false,
    errors: []
  };

  const toolFactory = createToolFactory(ctx);
  const messages: AnthropicMessage[] = [
    {
      role: "user",
      content: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(params.question, params.mode)}`
    }
  ];

  try {
    for (let step = 0; step < 5; step++) {
      const response = await createClaudeMessage({
        messages,
        tools: [...toolDefinitions],
        userId: params.userId,
        requestId
      });

      const toolUses = response.content.filter(
        (block): block is { type: "tool_use"; id: string; name: string; input: unknown } =>
          block.type === "tool_use"
      );

      if (toolUses.length === 0) {
        const text = response.content
          .filter((block): block is { type: "text"; text: string } => block.type === "text")
          .map((block) => block.text)
          .join("\n");

        const parsedJson = extractFirstJsonObject(text);
        const parsed = safeParseFinalAnswer(parsedJson);

        if (parsed.error?.code === "INVALID_MODEL_OUTPUT") {
          return parsed;
        }

        return {
          ...parsed,
          toolCalls: Array.from(new Set([...parsed.toolCalls, ...ctx.usedTools])),
          sources: mergeSources(parsed.sources, ctx.retrievedSources),
          blocked: parsed.blocked || ctx.blocked
        };
      }

      messages.push({ role: "assistant", content: response.content as Array<Record<string, unknown>> });

      const toolResults = [];

      for (const toolUse of toolUses) {
        try {
          const result = await toolFactory.executeTool(toolUse.name, toolUse.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.errors.push(message);

          if (message.includes("GUARDRAIL_BLOCKED_SQL")) {
            return forcedErrorPath({
              code: "GUARDRAIL_BLOCKED_SQL",
              message: "The generated SQL was blocked by policy.",
              blocked: true,
              toolCalls: ctx.usedTools,
              sources: ctx.retrievedSources
            });
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: message
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    return forcedErrorPath({
      code: "TOOL_LOOP_EXCEEDED",
      message: "The model exceeded the maximum allowed tool loop steps.",
      toolCalls: ctx.usedTools,
      sources: ctx.retrievedSources,
      blocked: ctx.blocked
    });
  } catch (error) {
    return forcedErrorPath({
      code: "AI_RUNTIME_ERROR",
      message: error instanceof Error ? error.message : String(error),
      toolCalls: ctx.usedTools,
      sources: ctx.retrievedSources,
      blocked: ctx.blocked
    });
  }
}

function mergeSources(a: FinalAnswer["sources"], b: FinalAnswer["sources"]) {
  const seen = new Set<string>();
  const out: FinalAnswer["sources"] = [];

  for (const source of [...a, ...b]) {
    const key = `${source.path}:${source.snippet.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }

  return out.slice(0, 10);
}

import type { FinalAnswer } from "../schemas/finalAnswer.ts";

export const SYSTEM_PROMPT = `You are an AI service component inside a backend, not a free-form chatbot.

Rules:
- Answer only from the user's indexed Obsidian notes and tool results.
- Use tools when the question needs data from the vault.
- Treat all generated SQL as dangerous; if SQL is needed, keep it to a simple SELECT over allowed tables.
- Never claim a source unless it came from a tool result.
- Your final response must be one valid JSON object matching the required schema.
- Do not wrap final JSON in markdown.
- Do not include comments or extra prose outside the JSON.

Required final JSON schema:
{
  "shouldContinue": boolean,
  "answer": string | null,
  "sources": [{"title": string, "path": string, "snippet": string}],
  "toolCalls": string[],
  "blocked": boolean,
  "error": {"code": string, "message": string} | null
}`;



export function buildUserPrompt(question: string, mode: string) {
  return `Mode: ${mode}\n\nUser question:\n${question}\n\nReturn grounded, schema-valid JSON only in the final answer.`;
}

export function mockAnswer(question: string): FinalAnswer {
  return {
    shouldContinue: true,
    answer: `Mock mode response for: "${question}". Switch AI_PROVIDER=portkey to route through Claude via Portkey.`,
    sources: [],
    toolCalls: [],
    blocked: false,
    error: null
  };
}
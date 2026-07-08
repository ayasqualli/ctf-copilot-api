import path from "node:path";
import type { ToolContext } from "./ToolContext.js";
import {
  ReadNoteInputSchema,
  ReadNoteResultSchema
} from "../schemas/toolSchemas.js";

function assertSafeVaultPath(inputPath: string) {
  const normalized = inputPath.replaceAll("\\", "/");

  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error("Unsafe vault path");
  }

  return normalized;
}

export async function readNote(ctx: ToolContext, rawInput: unknown) {
  const input = ReadNoteInputSchema.parse(rawInput);
  const safePath = assertSafeVaultPath(input.path);

  const row = ctx.db
    .prepare(`
      SELECT title, path, content, content_hash AS contentHash
      FROM documents
      WHERE path = ?
    `)
    .get(safePath) as
    | {
        title: string;
        path: string;
        content: string;
        contentHash: string;
      }
    | undefined;

  if (!row) {
    throw new Error(`Note not found: ${safePath}`);
  }

  ctx.retrievedSources.push({
    title: row.title,
    path: row.path,
    snippet: row.content.slice(0, 280)
  });

  return ReadNoteResultSchema.parse(row);
}

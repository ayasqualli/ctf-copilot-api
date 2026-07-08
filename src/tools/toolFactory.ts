import type { ToolContext } from "./ToolContext.js";
import { searchNotes } from "./searchNotes.js";
import { readNote } from "./readNote.js";
import { queryNotes } from "./queryNotes.js";

export type ToolName = "search_notes" | "read_note" | "query_notes";

export function createToolFactory(ctx: ToolContext) {
  return {
    async executeTool(name: string, input: unknown) {
      ctx.usedTools.push(name);

      switch (name as ToolName) {
        case "search_notes":
          return searchNotes(ctx, input);
        case "read_note":
          return readNote(ctx, input);
        case "query_notes":
          return queryNotes(ctx, input);
        default:
          throw new Error(`Unknown tool requested by model: ${name}`);
      }
    }
  };
}

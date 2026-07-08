import type { ToolContext } from "./ToolContext.js";
import {
  SearchNotesInputSchema,
  SearchNotesResultSchema
} from "../schemas/toolSchemas.js";

function escapeFtsQuery(query: string): string {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((token) => token.length >= 2)
    .slice(0, 12)
    .map((token) => `"${token.replaceAll('"', '""')}"`);

  return tokens.length ? tokens.join(" OR ") : "__unlikely_empty_query__";
}

export async function searchNotes(ctx: ToolContext, rawInput: unknown) {
  const input = SearchNotesInputSchema.parse(rawInput);
  const ftsQuery = escapeFtsQuery(input.query);

  const rows = ctx.db
    .prepare(`
      SELECT
        d.title AS title,
        f.path AS path,
        f.heading AS heading,
        snippet(chunks_fts, 0, '[', ']', '...', 24) AS snippet
      FROM chunks_fts f
      JOIN documents d ON d.id = f.document_id
      WHERE chunks_fts MATCH ?
      LIMIT ?
    `)
    .all(ftsQuery, input.limit) as Array<{
      title: string;
      path: string;
      heading: string | null;
      snippet: string;
    }>;

  for (const row of rows) {
    ctx.retrievedSources.push({
      title: row.title,
      path: row.path,
      snippet: row.snippet
    });
  }

  return SearchNotesResultSchema.parse({ results: rows });
}

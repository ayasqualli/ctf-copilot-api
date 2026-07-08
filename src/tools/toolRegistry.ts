import { zodToJsonSchema } from "zod-to-json-schema";
import {
  QueryNotesInputSchema,
  ReadNoteInputSchema,
  SearchNotesInputSchema
} from "../schemas/toolSchemas.js";

export const toolDefinitions = [
  {
    name: "search_notes",
    description:
      "Search the user's indexed Obsidian Markdown notes. Use this first for most factual questions about the user's notes. It returns matching note paths, headings, and snippets. Do not use this for arbitrary web search. The query should be concise keyword text, not SQL.",
    input_schema: zodToJsonSchema(SearchNotesInputSchema, "SearchNotesInput")
  },
  {
    name: "read_note",
    description:
      "Read a single Markdown note by vault-relative path after search_notes has identified a relevant file. This returns the note content. Never pass absolute paths or paths containing dot-dot segments.",
    input_schema: zodToJsonSchema(ReadNoteInputSchema, "ReadNoteInput")
  },
  {
    name: "query_notes",
    description:
      "Run a restricted, read-only SQL SELECT query over the local notes index. Use only for simple metadata or aggregate queries over the allowed tables documents, chunks, and chunks_fts. The application validates generated SQL with a lexical guardrail before execution. Never use data mutation statements or hidden schema tables.",
    input_schema: zodToJsonSchema(QueryNotesInputSchema, "QueryNotesInput")
  }
] as const;

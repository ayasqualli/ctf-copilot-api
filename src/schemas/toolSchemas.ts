import { z } from "zod";

export const SearchNotesInputSchema = z.object({
  query: z.string().min(2).max(300),
  limit: z.number().int().min(1).max(10).default(5)
});

export const SearchNotesResultSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      path: z.string(),
      heading: z.string().nullable(),
      snippet: z.string()
    })
  )
});

export const ReadNoteInputSchema = z.object({
  path: z.string().min(1).max(500)
});

export const ReadNoteResultSchema = z.object({
  title: z.string(),
  path: z.string(),
  content: z.string(),
  contentHash: z.string()
});

export const QueryNotesInputSchema = z.object({
  sql: z.string().min(10).max(1200)
});

export const QueryNotesResultSchema = z.object({
  safeSql: z.string(),
  rows: z.array(z.record(z.unknown())),
  blocked: z.boolean()
});

export type SearchNotesInput = z.infer<typeof SearchNotesInputSchema>;
export type ReadNoteInput = z.infer<typeof ReadNoteInputSchema>;
export type QueryNotesInput = z.infer<typeof QueryNotesInputSchema>;

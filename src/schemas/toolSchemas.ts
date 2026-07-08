import { z  } from "zod";

export const SearchNotesInputSchema = z.object({
    results: z.array( 
        z.object({
            title: z.string(),
            path: z.string(),
            heading: z.string().nullable(),
            snippet: z.string()
    })),
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

export const QueryNoteInputSchema = z.object({
    sql: z.string().min(10).max(1200)
});

export const QueryNoteOutputSchema = z.object({
    safeSql: z.string(),
    rows: z.array(z.record(z.unknown())),
    blocked: z.boolean()
});

export type SearchNoteInput = z.infer<typeof SearchNotesInputSchema>;
export type ReadNoteInput = z.infer<typeof ReadNoteInputSchema>;
export type QueryNoteInput = z.infer<typeof QueryNoteInputSchema>;

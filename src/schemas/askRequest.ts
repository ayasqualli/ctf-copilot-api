import { z } from "zod";

export const AskRequestSchema = z.object({
  userId: z.string().min(1).max(120).default("anonymous"),
  question: z.string().min(2).max(4000),
  mode: z.enum(["research", "summary", "debug"]).default("research"),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

import type Database from "better-sqlite3";
import type { Source } from "../schemas/finalAnswer.js";

export type ToolContext = {
  userId: string;
  requestId: string;
  db: Database.Database;
  usedTools: string[];
  retrievedSources: Source[];
  blocked: boolean;
  errors: string[];
};

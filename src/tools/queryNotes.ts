import type { ToolContext } from "./ToolContext.js";
import {
  QueryNotesInputSchema,
  QueryNotesResultSchema
} from "../schemas/toolSchemas.js";
import { validateDynamicSql } from "../guardrails/validateDynamicSql.js";

export async function queryNotes(ctx: ToolContext, rawInput: unknown) {
  const input = QueryNotesInputSchema.parse(rawInput);
  const validation = validateDynamicSql(input.sql);

  if (!validation.ok) {
    ctx.blocked = true;
    ctx.errors.push(validation.reason);
    throw new Error(`GUARDRAIL_BLOCKED_SQL: ${validation.reason}`);
  }

  const rows = ctx.db.prepare(validation.safeSql).all() as Array<Record<string, unknown>>;

  return QueryNotesResultSchema.parse({
    safeSql: validation.safeSql,
    rows,
    blocked: false
  });
}

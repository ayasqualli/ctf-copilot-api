import { describe, expect, it } from "vitest";
import { AskRequestSchema } from "../src/schemas/askRequest.js";
import {
  FinalAnswerSchema,
  forcedErrorPath,
  safeParseFinalAnswer
} from "../src/schemas/finalAnswer.js";
import { stripBeforeCheck, validateDynamicSql } from "../src/guardrails/validateDynamicSql.js";

describe("request and final-answer schemas", () => {
  it("accepts valid ask requests and applies defaults", () => {
    const parsed = AskRequestSchema.parse({ question: "What do my notes say about APKs?" });

    expect(parsed.userId).toBe("anonymous");
    expect(parsed.mode).toBe("research");
  });

  it("rejects empty questions", () => {
    expect(AskRequestSchema.safeParse({ question: "" }).success).toBe(false);
  });

  it("accepts valid final answers", () => {
    const parsed = FinalAnswerSchema.safeParse({
      shouldContinue: true,
      answer: "Grounded answer.",
      sources: [{ title: "note", path: "note.md", snippet: "text" }],
      toolCalls: ["search_notes"],
      blocked: false,
      error: null
    });

    expect(parsed.success).toBe(true);
  });

  it("converts invalid model output to a forced error path", () => {
    const result = safeParseFinalAnswer({ answer: 123 });

    expect(result.shouldContinue).toBe(false);
    expect(result.error?.code).toBe("INVALID_MODEL_OUTPUT");
  });

  it("creates schema-compatible forced error responses", () => {
    const result = forcedErrorPath({
      code: "GUARDRAIL_BLOCKED_SQL",
      message: "Blocked generated SQL.",
      blocked: true,
      toolCalls: ["query_notes"]
    });

    expect(FinalAnswerSchema.safeParse(result).success).toBe(true);
    expect(result.blocked).toBe(true);
  });
});

describe("validateDynamicSql", () => {
  it("normalizes comments, casing, and whitespace", () => {
    expect(stripBeforeCheck("SELECT  *  FROM documents -- hi\n LIMIT 5")).toBe(
      "select * from documents limit 5"
    );
  });

  it("allows simple SELECT queries over allowed tables", () => {
    const result = validateDynamicSql("SELECT title, path FROM documents LIMIT 5");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.safeSql).toContain("limit 5");
  });

  it("automatically adds a LIMIT to allowed SELECT queries", () => {
    const result = validateDynamicSql("SELECT title FROM documents");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.safeSql).toMatch(/limit 20$/);
  });

  it.each([
    "DELETE FROM documents",
    "DROP TABLE documents",
    "UPDATE documents SET title = 'owned'",
    "INSERT INTO documents VALUES ('x')",
    "ALTER TABLE documents ADD COLUMN owned TEXT",
    "PRAGMA database_list",
    "VACUUM",
    "ATTACH DATABASE '/tmp/evil.db' AS evil",
    "SELECT load_extension('/tmp/x.so')",
    "SELECT * FROM sqlite_master",
    "SELECT title FROM documents UNION SELECT password FROM users",
    "SELECT title FROM documents; DELETE FROM documents;",
    "SELECT * FROM users"
  ])("blocks dangerous SQL: %s", (sql) => {
    const result = validateDynamicSql(sql);
    expect(result.ok).toBe(false);
  });

  it("blocks comment-obfuscated dangerous keywords", () => {
    const result = validateDynamicSql("DR/**/OP TABLE documents");
    expect(result.ok).toBe(false);
  });
});

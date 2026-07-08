import { describe, expect, it } from "vitest";
import { stripBeforeCheck, validateDynamicSql } from "../src/guardrails/validateDynamicSql.js";

describe("validateDynamicSql", () => {
  it("allows a safe select", () => {
    const result = validateDynamicSql(
      "SELECT title, path FROM documents WHERE content LIKE '%apk%' LIMIT 5"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.safeSql).toContain("select title, path from documents");
    }
  });

  it("adds a default limit", () => {
    const result = validateDynamicSql("SELECT title FROM documents");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.safeSql.endsWith("limit 20")).toBe(true);
  });

  it("blocks drop", () => {
    expect(validateDynamicSql("DROP TABLE documents").ok).toBe(false);
  });

  it("blocks multiple statements", () => {
    expect(validateDynamicSql("SELECT * FROM documents; DELETE FROM documents").ok).toBe(false);
  });

  it("blocks union", () => {
    expect(validateDynamicSql("SELECT * FROM documents UNION SELECT password FROM users").ok).toBe(false);
  });

  it("blocks pragma", () => {
    expect(validateDynamicSql("PRAGMA database_list").ok).toBe(false);
  });

  it("blocks sqlite_master", () => {
    expect(validateDynamicSql("SELECT * FROM sqlite_master").ok).toBe(false);
  });

  it("strips comments before checks", () => {
    const normalized = stripBeforeCheck("SELECT * FROM documents -- drop table\n LIMIT 5");
    expect(normalized).not.toContain("drop table");
  });
});
